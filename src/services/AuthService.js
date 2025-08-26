import LocalStorageService from './LocalStorageService';
import JWTTokenService from './JWTTokenService';
import logger from './LoggingService';

class AuthService {
  // Admin credentials (hardcoded for super admin)
  static ADMIN_CREDENTIALS = [
    { username: 'admin', password: 'admin123' },
    { username: '8825549901', password: '12345' },
    { username: 'superadmin', password: 'super123' }
  ];

  // Authenticate user based on role and credentials
  static authenticateUser(credentials, role) {
    const { username, password } = credentials;

    try {
      switch (role) {
        case 'admin':
          return this.authenticateAdmin(username, password);

        case 'restaurant_owner':
          return this.authenticateRestaurantOwner(username, password);

        case 'zone_admin':
          return this.authenticateZoneAdmin(username, password);

        case 'zone_shop':
          return this.authenticateZoneShop(username, password);

        case 'zone_vendor':
          return this.authenticateZoneVendor(username, password);

        default:
          throw new Error('Invalid role specified');
      }
    } catch (error) {
      throw new Error(error.message || 'Authentication failed');
    }
  }

  // Authenticate Super Admin
  static authenticateAdmin(username, password) {
    const validCredentials = this.ADMIN_CREDENTIALS.find(
      cred => cred.username === username && cred.password === password
    );

    if (validCredentials) {
      const user = {
        id: 'super_admin',
        name: 'Super Admin',
        role: 'admin',
        username: username,
        subscription: { // Super admins have unlimited access
          key: 'super_admin',
          label: 'Super Admin',
          planType: 'admin',
          maxTables: null,
          maxShops: null,
          maxVendors: null,
          maxCategories: null,
          maxMenuItems: null,
          features: {
            crudMenu: true,
            qrGeneration: true,
            vendorManagement: true,
            analytics: true,
            qrCustomization: true,
            modifiers: true,
            watermark: false,
            unlimited: true
          }
        }
      };

      const tokens = this.generateTokens(user);
      return { 
        user, 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        success: true 
      };
    }

    throw new Error('Invalid admin credentials');
  }

  // Authenticate Restaurant Owner
  static authenticateRestaurantOwner(username, password) {
    const validationResult = LocalStorageService.validateShopCredentials(username, password);

    if (validationResult.valid && validationResult.shopData.type === 'restaurant_owner') {
      let subscription = validationResult.shopData.subscription;
      
      // PRIORITY: Check localStorage for the most recent subscription data first
      try {
        const storedSubscription = localStorage.getItem('tableserve_subscription');
        if (storedSubscription) {
          const parsedSubscription = JSON.parse(storedSubscription);
          if (parsedSubscription.planType === 'restaurant') {
            subscription = parsedSubscription;
            console.log('AuthService: Using localStorage subscription (most recent):', subscription);
          }
        }
      } catch (error) {
        console.warn('AuthService: Error loading subscription from localStorage:', error);
      }
      
      // If subscription is missing from credentials, try to get it from restaurant data
      if (!subscription) {
        console.log('AuthService: No subscription in credentials, checking restaurant data...');
        try {
          const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
          const restaurant = restaurants.find(r => r.id === validationResult.shopData.shopId);
          if (restaurant && restaurant.subscription) {
            subscription = restaurant.subscription;
            console.log('AuthService: Found subscription in restaurant data:', subscription);
          } else if (restaurant && restaurant.subscriptionPlan) {
            // Convert old subscriptionPlan format to new subscription object
            const { RESTAURANT_PLANS } = require('../constants/plans');
            subscription = RESTAURANT_PLANS[restaurant.subscriptionPlan] || RESTAURANT_PLANS.free;
            console.log('AuthService: Converted subscriptionPlan to subscription:', subscription);
          }
        } catch (error) {
          console.error('AuthService: Error loading restaurant subscription:', error);
        }
      }
      
      const user = {
        id: validationResult.shopData.shopId,
        name: validationResult.shopData.ownerName,
        role: 'restaurant_owner',
        username: username,
        restaurantId: validationResult.shopData.shopId,
        restaurantName: validationResult.shopData.shopName,
        email: validationResult.shopData.email || '',
        phone: validationResult.shopData.phone || '',
        subscription: subscription // Include enhanced subscription data
      };
      const tokens = this.generateTokens(user);
      return { 
        user, 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        success: true 
      };
    }
    throw new Error('Invalid restaurant owner credentials');
  }

  // Authenticate Zone Admin
  static authenticateZoneAdmin(username, password) {
    const validationResult = LocalStorageService.validateShopCredentials(username, password);

    if (validationResult.valid && validationResult.shopData.type === 'zone_admin') {
      let subscription = validationResult.shopData.subscription;
      
      // PRIORITY: Check localStorage for the most recent subscription data first
      try {
        const storedSubscription = localStorage.getItem('tableserve_subscription');
        if (storedSubscription) {
          const parsedSubscription = JSON.parse(storedSubscription);
          if (parsedSubscription.planType === 'zone') {
            subscription = parsedSubscription;
            console.log('AuthService: Using localStorage subscription (most recent):', subscription);
          }
        }
      } catch (error) {
        console.warn('AuthService: Error loading subscription from localStorage:', error);
      }
      
      // If subscription is missing from credentials, try to get it from zone data
      if (!subscription) {
        console.log('AuthService: No subscription in zone credentials, checking zone data...');
        try {
          const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
          const zone = zones.find(z => z.id === validationResult.shopData.zoneId);
          if (zone && zone.subscription) {
            subscription = zone.subscription;
            console.log('AuthService: Found subscription in zone data:', subscription);
          } else if (zone && zone.subscriptionPlan) {
            // Convert old subscriptionPlan format to new subscription object
            const { ZONE_PLANS } = require('../constants/plans');
            subscription = ZONE_PLANS[zone.subscriptionPlan] || ZONE_PLANS.free;
            console.log('AuthService: Converted zone subscriptionPlan to subscription:', subscription);
          }
        } catch (error) {
          console.error('AuthService: Error loading zone subscription:', error);
        }
      }
      
      const user = {
        id: validationResult.shopData.shopId,
        name: validationResult.shopData.ownerName,
        role: 'zone_admin',
        username: username,
        zoneId: validationResult.shopData.zoneId,
        zoneName: validationResult.shopData.shopName,
        email: validationResult.shopData.email || '',
        phone: validationResult.shopData.phone || '',
        subscription: subscription // Include enhanced subscription data
      };
      const tokens = this.generateTokens(user);
      return { 
        user, 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        success: true 
      };
    }
    throw new Error('Invalid zone admin credentials');
  }

  // Authenticate Zone Shop
  static authenticateZoneShop(username, password) {
    const validationResult = LocalStorageService.validateShopCredentials(username, password);

    if (validationResult.valid && validationResult.shopData.type === 'zone_shop') {
      let subscription = null;
      
      // Zone shops inherit subscription from their parent zone
      console.log('AuthService: Getting zone shop subscription from parent zone...');
      try {
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const parentZone = zones.find(z => z.id === validationResult.shopData.zoneId);
        if (parentZone && parentZone.subscription) {
          subscription = parentZone.subscription;
          console.log('AuthService: Found parent zone subscription:', subscription);
        } else if (parentZone && parentZone.subscriptionPlan) {
          // Convert old subscriptionPlan format
          const { ZONE_PLANS } = require('../constants/plans');
          subscription = ZONE_PLANS[parentZone.subscriptionPlan] || ZONE_PLANS.free;
          console.log('AuthService: Converted parent zone subscriptionPlan:', subscription);
        }
      } catch (error) {
        console.error('AuthService: Error loading parent zone subscription:', error);
      }
      
      const user = {
        id: validationResult.shopData.shopId,
        name: validationResult.shopData.ownerName,
        role: 'zone_shop',
        username: username,
        shopId: validationResult.shopData.shopId,
        zoneId: validationResult.shopData.zoneId,
        shopName: validationResult.shopData.shopName,
        type: 'zone_shop',
        subscription: subscription // Include parent zone subscription
      };
      const tokens = this.generateTokens(user);
      return { 
        user, 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        success: true 
      };
    }
    throw new Error('Invalid zone shop credentials');
  }

  // Authenticate Zone Vendor
  static authenticateZoneVendor(username, password) {
    const validationResult = LocalStorageService.validateShopCredentials(username, password);

    if (validationResult.valid && validationResult.shopData.type === 'zone_vendor') {
      let subscription = null;
      
      // Zone vendors inherit subscription from their parent zone
      console.log('AuthService: Getting zone vendor subscription from parent zone...');
      try {
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const parentZone = zones.find(z => z.id === validationResult.shopData.zoneId);
        if (parentZone && parentZone.subscription) {
          subscription = parentZone.subscription;
          console.log('AuthService: Found parent zone subscription:', subscription);
        } else if (parentZone && parentZone.subscriptionPlan) {
          // Convert old subscriptionPlan format
          const { ZONE_PLANS } = require('../constants/plans');
          subscription = ZONE_PLANS[parentZone.subscriptionPlan] || ZONE_PLANS.free;
          console.log('AuthService: Converted parent zone subscriptionPlan:', subscription);
        }
      } catch (error) {
        console.error('AuthService: Error loading parent zone subscription:', error);
      }
      
      const user = {
        id: validationResult.shopData.shopId,
        name: validationResult.shopData.ownerName,
        role: 'zone_vendor',
        username: username,
        shopId: validationResult.shopData.shopId,
        zoneId: validationResult.shopData.zoneId,
        shopName: validationResult.shopData.shopName,
        type: 'zone_vendor',
        subscription: subscription // Include parent zone subscription
      };
      const tokens = this.generateTokens(user);
      return { 
        user, 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        success: true 
      };
    }
    throw new Error('Invalid zone vendor credentials');
  }

  // Try to authenticate with any role (for login form)
  static authenticateAnyRole(username, password) {
    const roles = ['admin', 'restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor'];

    console.log('AuthService: Attempting authentication for username:', username);
    
    for (const role of roles) {
      try {
        console.log(`AuthService: Trying role: ${role}`);
        const result = this.authenticateUser({ username, password }, role);
        console.log(`AuthService: Successfully authenticated as ${role}:`, {
          userId: result.user.id,
          userRole: result.user.role,
          restaurantId: result.user.restaurantId,
          zoneId: result.user.zoneId,
          hasSubscription: !!result.user.subscription
        });
        return result;
      } catch (error) {
        console.log(`AuthService: Failed to authenticate as ${role}:`, error.message);
        // Continue to next role
        continue;
      }
    }

    throw new Error('Invalid credentials');
  }

  // Generate JWT tokens and store them securely
  static generateTokens(user) {
    try {
      const tokenPayload = {
        id: user.id,
        role: user.role,
        username: user.username,
        name: user.name,
        ...(user.restaurantId && { restaurantId: user.restaurantId }),
        ...(user.zoneId && { zoneId: user.zoneId }),
        ...(user.shopId && { shopId: user.shopId })
      };

      const accessToken = JWTTokenService.generateAccessToken(tokenPayload);
      const refreshToken = JWTTokenService.generateRefreshToken(tokenPayload);
      
      // Store tokens securely
      JWTTokenService.storeTokens(accessToken, refreshToken, user);
      
      logger.info('JWT tokens generated and stored', { 
        userId: user.id, 
        role: user.role 
      }, 'AuthService');
      
      return {
        accessToken,
        refreshToken,
        user: tokenPayload
      };
    } catch (error) {
      logger.error('Failed to generate JWT tokens', error, 'AuthService');
      throw new Error('Token generation failed');
    }
  }

  // Verify current authentication status
  static verifyAuthentication() {
    try {
      return JWTTokenService.isAuthenticated();
    } catch (error) {
      logger.error('Authentication verification failed', error, 'AuthService');
      return false;
    }
  }

  // Get current authenticated user
  static getCurrentUser() {
    try {
      return JWTTokenService.getCurrentUser();
    } catch (error) {
      logger.error('Failed to get current user', error, 'AuthService');
      return null;
    }
  }

  // Refresh authentication tokens
  static async refreshTokens() {
    try {
      const refreshResult = await JWTTokenService.refreshAccessToken();
      if (refreshResult) {
        logger.info('Tokens refreshed successfully', {}, 'AuthService');
        return {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          success: true
        };
      }
      return { success: false, error: 'Token refresh failed' };
    } catch (error) {
      logger.error('Token refresh failed', error, 'AuthService');
      return { success: false, error: error.message };
    }
  }

  // Logout and clear all tokens
  static logout() {
    try {
      JWTTokenService.clearTokens();
      logger.info('User logged out successfully', {}, 'AuthService');
      return { success: true };
    } catch (error) {
      logger.error('Logout failed', error, 'AuthService');
      return { success: false, error: error.message };
    }
  }
}

export default AuthService;