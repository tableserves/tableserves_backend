/**
 * Simple Token Service - Unified token management for TableServe
 * This service provides a single, reliable way to store and retrieve authentication tokens
 */

class SimpleTokenService {
  constructor() {
    // Use consistent key names
    this.ACCESS_TOKEN_KEY = 'tableserve_access_token';
    this.REFRESH_TOKEN_KEY = 'tableserve_refresh_token';
    this.USER_DATA_KEY = 'tableserve_user_data';
    this.BUSINESS_ENTITY_KEY = 'tableserve_business_entity';
  }

  /**
   * Store authentication tokens and user data
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token  
   * @param {Object} userData - User information
   */
  storeTokens(accessToken, refreshToken, userData) {
    try {
      if (!accessToken || !refreshToken || !userData) {
        throw new Error('Missing required token data');
      }

      // Store access token in localStorage (persists across browser sessions)
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);

      // Store refresh token in localStorage (persists across browser sessions)
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);

      // Store comprehensive user data in localStorage (persists across browser sessions)
      const comprehensiveUserData = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        name: userData.name || userData.profile?.name,
        businessType: userData.businessType,
        // Business entity IDs for routing
        restaurantId: userData.restaurantId,
        restaurantName: userData.restaurantName,
        restaurantSlug: userData.restaurantSlug,
        restaurantStatus: userData.restaurantStatus,
        zoneId: userData.zoneId,
        zoneName: userData.zoneName,
        zoneSlug: userData.zoneSlug,
        zoneStatus: userData.zoneStatus,
        shopId: userData.shopId,
        shopName: userData.shopName,
        // Additional fields that might be needed
        profile: userData.profile,
        status: userData.status,
        emailVerified: userData.emailVerified,
        phoneVerified: userData.phoneVerified,
        subscription: userData.subscription,
        businessSubscription: userData.businessSubscription
      };
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(comprehensiveUserData));

      console.log('✅ Tokens stored successfully', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        userId: userData.id,
        role: userData.role
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
      return false;
    }
  }

  /**
   * Get the current access token
   * @returns {string|null} Access token or null if not found
   */
  getAccessToken() {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get the current refresh token
   * @returns {string|null} Refresh token or null if not found
   */
  getRefreshToken() {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   * @returns {Object|null} User data or null if not found
   */
  getUserData() {
    try {
      const userData = localStorage.getItem(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (has valid tokens)
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    
    console.log('SimpleTokenService.isAuthenticated: Checking tokens', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    if (!accessToken || !refreshToken) {
      console.log('❌ isAuthenticated: Missing tokens', { accessToken: !!accessToken, refreshToken: !!refreshToken });
      return false;
    }
    
    try {
      // Check if token is expired
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Handle missing expiry (for tokens without expiration)
      if (!payload.exp) {
        console.log('ℹ️ Token has no expiry - treating as valid');
        return true;
      }
      
      // Validate payload.exp
      if (!isFinite(payload.exp) || payload.exp <= 0) {
        console.warn('❌ Invalid token expiry:', payload.exp);
        return false;
      }
      
      const isValid = payload.exp > now;
      console.log('🔍 Token validation:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        tokenExpiry: payload.exp,
        currentTime: now,
        timeUntilExpiry: payload.exp - now,
        isValid: isValid
      });
      
      if (!isValid) {
        // Safely create dates with validation
        const expiredAtMs = payload.exp * 1000;
        const currentTimeMs = now * 1000;
        
        let expiredAtStr = 'Invalid Date';
        let currentTimeStr = 'Invalid Date';
        
        try {
          if (isFinite(expiredAtMs) && expiredAtMs > 0) {
            expiredAtStr = new Date(expiredAtMs).toISOString();
          }
        } catch (e) {
          expiredAtStr = `Invalid (${payload.exp})`;
        }
        
        try {
          if (isFinite(currentTimeMs) && currentTimeMs > 0) {
            currentTimeStr = new Date(currentTimeMs).toISOString();
          }
        } catch (e) {
          currentTimeStr = `Invalid (${now})`;
        }
        
        console.log('❌ Token has expired', {
          expiredAt: expiredAtStr,
          currentTime: currentTimeStr,
          rawExp: payload.exp,
          rawNow: now
        });
      }
      
      return isValid;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data
   */
  clearTokens() {
    try {
      // Clear from localStorage (where we now store everything)
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_DATA_KEY);
      localStorage.removeItem(this.BUSINESS_ENTITY_KEY);

      // Also clear from sessionStorage for legacy cleanup
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(this.USER_DATA_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);

      // Also clear legacy token locations for cleanup
      const legacyKeys = [
        'authToken', 'accessToken', 'refreshToken',
        'tableserve_jwt_token', 'tableserve_refresh_token', 'tableserve_user_data'
      ];

      legacyKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });

      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  }

  /**
   * Update access token (used during token refresh)
   * @param {string} newAccessToken - New access token
   */
  updateAccessToken(newAccessToken) {
    try {
      if (!newAccessToken) {
        throw new Error('New access token is required');
      }

      localStorage.setItem(this.ACCESS_TOKEN_KEY, newAccessToken);
      console.log('✅ Access token updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update access token:', error);
      return false;
    }
  }

  /**
   * Get business entity data
   * @returns {Object|null} Business entity data
   */
  getBusinessEntity() {
    try {
      const businessEntityData = localStorage.getItem(this.BUSINESS_ENTITY_KEY);
      return businessEntityData ? JSON.parse(businessEntityData) : null;
    } catch (error) {
      console.error('❌ Error getting business entity data:', error);
      return null;
    }
  }

  /**
   * Get authentication header for API requests
   * @returns {Object} Headers object with Authorization header
   */
  getAuthHeaders() {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return {};
    }

    return {
      'Authorization': `Bearer ${accessToken}`
    };
  }

  /**
   * Debug method to show current token status
   */
  debugTokenStatus() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const userData = this.getUserData();
    
    console.log('🔍 Token Status Debug:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUserData: !!userData,
      isAuthenticated: this.isAuthenticated(),
      userData: userData,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });
  }
}

// Create and export a singleton instance
const simpleTokenService = new SimpleTokenService();
export default simpleTokenService;