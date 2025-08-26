import { store } from '../store';
import { setVendors, addVendor, updateVendor, deleteVendor } from '../store/slices/vendorsSlice';
import dataAccessLayer from './DataAccessLayer';
import logger from './LoggingService';

// Local Storage Service for TableServe Application
// DEPRECATED: This service is being migrated to use DataAccessLayer
// New code should use DataAccessLayer or DataService directly
class LocalStorageService {
  // Storage keys
  static KEYS = {
    RESTAURANTS: 'tableserve_restaurants',
    ZONES: 'tableserve_zones',
    OTP_SESSIONS: 'tableserve_otp_sessions',
    ZONE_SHOPS: 'tableserve_zone_shops',
    ZONE_VENDORS: 'tableserve_zone_vendors',
    ZONE_ORDERS: 'tableserve_zone_orders',
    ZONE_ANALYTICS: 'tableserve_zone_analytics',
    CUSTOMERS: 'tableserve_customers',
  };

  // Restaurant Management
  static getRestaurants() {
    try {
      // Use DataAccessLayer for consistency
      return dataAccessLayer.getRestaurants();
    } catch (error) {
      logger.error('Error loading restaurants from localStorage', error, 'LocalStorageService');
      return [];
    }
  }

  static getRestaurant(restaurantId) {
    try {
      // Use DataAccessLayer for consistency
      return dataAccessLayer.getRestaurant(restaurantId);
    } catch (error) {
      logger.error('Error getting restaurant', error, 'LocalStorageService');
      return null;
    }
  }

  static saveRestaurants(restaurants) {
    try {
      // Use DataAccessLayer for consistency
      return dataAccessLayer.saveRestaurants(restaurants);
    } catch (error) {
      logger.error('Error saving restaurants to localStorage', error, 'LocalStorageService');
      return false;
    }
  }

  static addRestaurant(restaurant) {
    try {
      // Use DataAccessLayer for consistency
      const newRestaurant = dataAccessLayer.addRestaurant(restaurant);
      
      if (newRestaurant) {
        // Save restaurant credentials for login
        this.saveShopCredentials(newRestaurant);
        logger.info('Restaurant added successfully', { restaurantId: newRestaurant.id }, 'LocalStorageService');
      }
      
      return newRestaurant;
    } catch (error) {
      logger.error('Error adding restaurant', error, 'LocalStorageService');
      return null;
    }
  }

  static updateRestaurant(restaurantId, updates) {
    try {
      // Use DataAccessLayer for consistency
      const updatedRestaurant = dataAccessLayer.updateRestaurant(restaurantId, updates);
      
      if (updatedRestaurant) {
        logger.info('Restaurant updated successfully', { restaurantId }, 'LocalStorageService');
      }
      
      return updatedRestaurant;
    } catch (error) {
      logger.error('Error updating restaurant', error, 'LocalStorageService');
      return null;
    }
  }

  static deleteRestaurant(restaurantId) {
    try {
      // Use DataAccessLayer for consistency
      const deleted = dataAccessLayer.deleteRestaurant(restaurantId);
      
      if (deleted) {
        logger.info('Restaurant deleted successfully', { restaurantId }, 'LocalStorageService');
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting restaurant', error, 'LocalStorageService');
      return false;
    }
  }

  static getRestaurantById(restaurantId) {
    const restaurants = this.getRestaurants();
    return restaurants.find(r => r.id == restaurantId) || null; // Use == for type coercion
  }

  // Customer Management
  static getCustomers() {
    try {
      const data = localStorage.getItem(this.KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading customers from localStorage:', error);
      return [];
    }
  }

  static saveCustomers(customers) {
    try {
      localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify(customers));
      return true;
    } catch (error) {
      console.error('Error saving customers to localStorage:', error);
      return false;
    }
  }

  static getCustomerByPhone(phone) {
    const customers = this.getCustomers();
    return customers.find(c => c.phone === phone) || null;
  }

  static createCustomer(customerData) {
    const customers = this.getCustomers();
    const newCustomer = {
      ...customerData,
      id: `cust_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    customers.push(newCustomer);
    this.saveCustomers(customers);
    return newCustomer;
  }

  static getMenuItems({ restaurantId, shopId, zoneId }) {
    try {
      // Use DataAccessLayer for consistent menu item access
      return dataAccessLayer.getMenuItems({ restaurantId, shopId, zoneId });
    } catch (error) {
      logger.error('Error getting menu items', error, 'LocalStorageService');
      return [];
    }
  }

  static getRestaurantDetails({ restaurantId, zoneId }) {
    if (restaurantId) {
      return this.getRestaurant(restaurantId);
    }
    if (zoneId) {
      return this.getZoneById(zoneId);
    }
    return null;
  }

  // Zone Management
  static getZones() {
    try {
      // Use DataAccessLayer for consistency
      return dataAccessLayer.getZones();
    } catch (error) {
      logger.error('Error loading zones from localStorage', error, 'LocalStorageService');
      return [];
    }
  }

  static saveZones(zones) {
    try {
      // Use DataAccessLayer for consistency
      return dataAccessLayer.saveZones(zones);
    } catch (error) {
      logger.error('Error saving zones to localStorage', error, 'LocalStorageService');
      return false;
    }
  }

  static addZone(zone) {
    try {
      // Use DataAccessLayer for consistency
      const newZone = dataAccessLayer.addZone(zone);
      
      if (newZone) {
        logger.info('Zone added successfully', { zoneId: newZone.id }, 'LocalStorageService');
      }
      
      return newZone;
    } catch (error) {
      logger.error('Error adding zone', error, 'LocalStorageService');
      return null;
    }
  }

  static updateZone(zoneId, updates) {
    try {
      // Use DataAccessLayer for consistency
      const updatedZone = dataAccessLayer.updateZone(zoneId, updates);
      
      if (updatedZone) {
        logger.info('Zone updated successfully', { zoneId }, 'LocalStorageService');
      }
      
      return updatedZone;
    } catch (error) {
      logger.error('Error updating zone', error, 'LocalStorageService');
      return null;
    }
  }

  static deleteZone(zoneId) {
    try {
      // Use DataAccessLayer for consistency
      const deleted = dataAccessLayer.deleteZone(zoneId);
      
      if (deleted) {
        logger.info('Zone deleted successfully', { zoneId }, 'LocalStorageService');
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting zone', error, 'LocalStorageService');
      return false;
    }
  }

  static getZoneById(zoneId) {
    try {
      // Use DataAccessLayer for consistency
      return dataAccessLayer.getZone(zoneId);
    } catch (error) {
      logger.error('Error getting zone by ID', error, 'LocalStorageService');
      return null;
    }
  }

  // OTP Session Management
  static getOTPSessions() {
    try {
      const data = localStorage.getItem(this.KEYS.OTP_SESSIONS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading OTP sessions from localStorage:', error);
      return {};
    }
  }

  static saveOTPSessions(sessions) {
    try {
      localStorage.setItem(this.KEYS.OTP_SESSIONS, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error('Error saving OTP sessions to localStorage:', error);
      return false;
    }
  }

  static createOTPSession(phoneNumber, otp, purpose, entityId) {
    const sessions = this.getOTPSessions();
    const sessionId = `${phoneNumber}_${Date.now()}`;
    const session = {
      id: sessionId,
      phoneNumber,
      otp,
      purpose, // 'password_reset', 'password_change'
      entityId, // restaurant or zone ID
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      verified: false
    };

    sessions[sessionId] = session;
    this.saveOTPSessions(sessions);
    return session;
  }

  static verifyOTP(sessionId, enteredOTP) {
    const sessions = this.getOTPSessions();
    const session = sessions[sessionId];

    if (!session) {
      return { success: false, message: 'Invalid session' };
    }

    if (new Date() > new Date(session.expiresAt)) {
      delete sessions[sessionId];
      this.saveOTPSessions(sessions);
      return { success: false, message: 'OTP expired' };
    }

    if (session.otp !== enteredOTP) {
      return { success: false, message: 'Invalid OTP' };
    }

    session.verified = true;
    sessions[sessionId] = session;
    this.saveOTPSessions(sessions);

    return { success: true, session };
  }

  static cleanupExpiredOTPSessions() {
    const sessions = this.getOTPSessions();
    const now = new Date();
    let cleaned = false;

    Object.keys(sessions).forEach(sessionId => {
      if (new Date(sessions[sessionId].expiresAt) < now) {
        delete sessions[sessionId];
        cleaned = true;
      }
    });

    if (cleaned) {
      this.saveOTPSessions(sessions);
    }
  }

  // Utility Methods
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }

  static clearAllData() {
    try {
      localStorage.removeItem(this.KEYS.RESTAURANTS);
      localStorage.removeItem(this.KEYS.ZONES);
      localStorage.removeItem(this.KEYS.OTP_SESSIONS);
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // Data Export/Import for backup
  static exportData() {
    return {
      restaurants: this.getRestaurants(),
      zones: this.getZones(),
      exportedAt: new Date().toISOString()
    };
  }

  static importData(data) {
    try {
      if (data.restaurants) {
        this.saveRestaurants(data.restaurants);
      }
      if (data.zones) {
        this.saveZones(data.zones);
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Search and Filter Utilities
  static searchRestaurants(searchTerm, filters = {}) {
    const restaurants = this.getRestaurants();
    let filtered = restaurants;

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(term) ||
        restaurant.ownerName.toLowerCase().includes(term) ||
        restaurant.cuisine.toLowerCase().includes(term) ||
        restaurant.address.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter(restaurant => restaurant.status === filters.status);
    }

    if (filters.cuisine) {
      filtered = filtered.filter(restaurant => restaurant.cuisine === filters.cuisine);
    }

    return filtered;
  }

  static searchZones(searchTerm, filters = {}) {
    const zones = this.getZones();
    let filtered = zones;

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(zone =>
        zone.name.toLowerCase().includes(term) ||
        zone.ownerName.toLowerCase().includes(term) ||
        zone.city.toLowerCase().includes(term) ||
        zone.address.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter(zone => zone.status === filters.status);
    }

    if (filters.city) {
      filtered = filtered.filter(zone => zone.city === filters.city);
    }

    return filtered;
  }

  // Zone Shops Management
  static getZoneShops(zoneId) {
    try {
      const shopData = localStorage.getItem(`${this.KEYS.ZONE_SHOPS}_${zoneId}`);
      const shops = shopData ? JSON.parse(shopData) : [];

      const vendors = this.getZoneVendors(zoneId);

      // Merge shops and vendors, ensuring unique IDs and adding a 'type' field
      const mergedList = {};

      shops.forEach(shop => {
        mergedList[shop.id] = { ...shop, type: 'shop' };
      });

      vendors.forEach(vendor => {
        // Prioritize vendor data if there's an ID conflict, or add if new
        mergedList[vendor.id] = { ...vendor, type: 'vendor' };
      });

      return Object.values(mergedList);
    } catch (error) {
      console.error('Error loading zone shops and vendors from localStorage:', error);
      return [];
    }
  }

  static saveZoneShops(zoneId, shops) {
    try {
      localStorage.setItem(`${this.KEYS.ZONE_SHOPS}_${zoneId}`, JSON.stringify(shops));
      return true;
    } catch (error) {
      console.error('Error saving zone shops to localStorage:', error);
      return false;
    }
  }

  static addZoneShop(zoneId, shop) {
    const shops = this.getZoneShops(zoneId);
    const newShop = {
      ...shop,
      id: Date.now().toString(),
      zoneId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      todayRevenue: 0,
      todayOrders: 0,
      totalOrders: 0,
      rating: 0,
      joinDate: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toISOString()
    };
    shops.push(newShop);
    this.saveZoneShops(zoneId, shops);

    // Save shop credentials for login
    this.saveShopCredentials(newShop);

    return newShop;
  }

  static updateZoneShop(zoneId, shopId, updates) {
    const shops = this.getZoneShops(zoneId);
    const index = shops.findIndex(s => s.id == shopId);
    if (index !== -1) {
      shops[index] = {
        ...shops[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveZoneShops(zoneId, shops);
      return shops[index];
    }
    return null;
  }

  static deleteZoneShop(zoneId, shopId) {
    const shops = this.getZoneShops(zoneId);
    const filtered = shops.filter(s => s.id != shopId);
    this.saveZoneShops(zoneId, filtered);
    return filtered.length < shops.length;
  }

  // Zone Vendors Management
  static getZoneVendors(zoneId) {
    try {
      // Use DataAccessLayer for unified vendor access
      return dataAccessLayer.getVendors(zoneId);
    } catch (error) {
      logger.error('Error loading zone vendors from localStorage', error, 'LocalStorageService');
      return [];
    }
  }

  static saveZoneVendors(zoneId, vendors) {
    try {
      // Use DataAccessLayer for unified vendor saving
      const success = dataAccessLayer.saveVendors(zoneId, vendors);
      
      if (success) {
        logger.info('Zone vendors saved successfully', { zoneId, count: vendors.length }, 'LocalStorageService');
      }
      
      return success;
    } catch (error) {
      logger.error('Error saving zone vendors', error, 'LocalStorageService');
      return false;
    }
  }

  static addZoneVendor(zoneId, vendor) {
    console.log(`Adding vendor to zone: ${zoneId}`, vendor);

    // Get zone vendors - clone to avoid mutating a potentially frozen array from Redux/state
    const vendors = [...this.getZoneVendors(zoneId)];

    // Create new vendor with required fields (sanitize large fields to avoid quota issues)
    const vendorBase = { ...vendor };
    delete vendorBase.logo;
    delete vendorBase.coverImage;

    const newVendor = {
      ...vendorBase,
      id: Date.now().toString(),
      zoneId,
      status: 'active', // Ensure status is set to active
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      monthlyRevenue: 0,
      totalOrders: 0,
      rating: 0,
      menuItems: 0,
      tableCount: 0,
      avgOrderValue: 0,
      lastActivity: new Date().toISOString()
    };

    // Add to vendors array
    vendors.push(newVendor);

    // Save to both zone and admin vendors using our improved saveZoneVendors method
    const saved = this.saveZoneVendors(zoneId, vendors);
    if (!saved) {
      console.warn('Failed to save vendors due to storage quota. Consider clearing local data or reducing payload size.');
      return null;
    }
    console.log(`Saved vendor to zone and admin vendors: ${zoneId}`);

    // Update main zone data for Super Admin dashboard
    try {
      const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
      const zoneIndex = zones.findIndex(z => z.id == zoneId);

      if (zoneIndex !== -1) {
        // Update zone data with new vendor count
        zones[zoneIndex] = {
          ...zones[zoneIndex],
          vendorCount: vendors.length,
          activeVendors: vendors.filter(v => v.status === 'active').length,
          lastVendorAdded: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        localStorage.setItem('tableserve_zones', JSON.stringify(zones));
        console.log('Updated main zone data with new vendor count:', vendors.length);
      }
    } catch (error) {
      console.error('Error updating main zone data with new vendor:', error);
    }

    // If login credentials provided, save them to the shared credentials store
    try {
      if (newVendor.loginCredentials?.username && newVendor.loginCredentials?.password) {
        this.saveShopCredentials({
          ...newVendor,
          name: newVendor.name,
          ownerName: newVendor.ownerName,
          status: newVendor.status,
          type: 'zone_vendor'
        });
      }
    } catch (e) {
      console.error('Error saving vendor credentials:', e);
    }

    return newVendor;
  }

  static updateZoneVendor(zoneId, vendorId, updates) {
    // Get vendors - this will already sync admin and zone vendors
    const vendors = this.getZoneVendors(zoneId);
    const index = vendors.findIndex(v => v.id == vendorId);

    if (index !== -1) {
      const prev = vendors[index];
      vendors[index] = {
        ...vendors[index],
        ...updates,
        zoneId: zoneId, // Ensure zoneId is set correctly
        updatedAt: new Date().toISOString()
      };

      // Save to both zone and admin vendors using our improved saveZoneVendors method
      this.saveZoneVendors(zoneId, vendors);
      console.log(`Updated vendor ${vendorId} in zone ${zoneId}`);

      // Update main zone data for Super Admin dashboard
      try {
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const zoneIndex = zones.findIndex(z => z.id == zoneId);

        if (zoneIndex !== -1) {
          // Update zone data with vendor update info
          zones[zoneIndex] = {
            ...zones[zoneIndex],
            lastVendorUpdate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // If vendor status changed, update active vendor count
          if (updates.status && prev.status !== updates.status) {
            const activeVendors = vendors.filter(v => v.status === 'active').length;
            zones[zoneIndex].activeVendors = activeVendors;
          }

          localStorage.setItem('tableserve_zones', JSON.stringify(zones));
          console.log('Updated main zone data with vendor update');
        }
      } catch (error) {
        console.error('Error updating main zone data with vendor update:', error);
      }

      // Sync credentials: password and status
      try {
        if (updates?.loginCredentials?.password) {
          this.updateShopCredentials(vendorId, zoneId, updates.loginCredentials.password);
        }
        if (typeof updates?.status === 'string') {
          const raw = localStorage.getItem('tableserve_shop_credentials') || '{}';
          const creds = JSON.parse(raw);
          for (const uname in creds) {
            if (creds[uname].shopId === vendorId && creds[uname].zoneId === zoneId) {
              creds[uname].status = updates.status;
              creds[uname].updatedAt = new Date().toISOString();
              break;
            }
          }
          localStorage.setItem('tableserve_shop_credentials', JSON.stringify(creds));
        }
      } catch (e) {
        console.error('Error syncing vendor credentials:', e);
      }

      return vendors[index];
    }
    return null;
  }

  static deleteZoneVendor(zoneId, vendorId) {
    // Get vendors - this will already sync admin and zone vendors
    const vendors = this.getZoneVendors(zoneId);
    const filtered = vendors.filter(v => v.id != vendorId);
    const removed = filtered.length < vendors.length;

    // Save to both zone and admin vendors using our improved saveZoneVendors method
    this.saveZoneVendors(zoneId, filtered);
    console.log(`Deleted vendor ${vendorId} from zone ${zoneId}`);

    // Also explicitly remove from admin vendors to ensure consistency
    try {
      const adminVendorsKey = `tableserve_admin_vendors_${zoneId}`;
      localStorage.setItem(adminVendorsKey, JSON.stringify(filtered));
      console.log(`Updated admin vendors after deletion for zone: ${zoneId}`);
    } catch (error) {
      console.error('Error updating admin vendors after deletion:', error);
    }

    // Dispatch Redux action
    if (removed) {
      store.dispatch(deleteVendor(vendorId));

      // Update main zone data for Super Admin dashboard
      try {
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const zoneIndex = zones.findIndex(z => z.id == zoneId);

        if (zoneIndex !== -1) {
          // Update zone data with new vendor count
          const activeVendors = filtered.filter(v => v.status === 'active').length;

          zones[zoneIndex] = {
            ...zones[zoneIndex],
            vendorCount: filtered.length,
            activeVendors: activeVendors,
            lastVendorRemoved: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          localStorage.setItem('tableserve_zones', JSON.stringify(zones));
          console.log('Updated main zone data after vendor removal');
        }
      } catch (error) {
        console.error('Error updating main zone data after vendor removal:', error);
      }
    }

    // Remove credentials if present
    if (removed) {
      try {
        const raw = localStorage.getItem('tableserve_shop_credentials') || '{}';
        const creds = JSON.parse(raw);
        for (const uname in creds) {
          if (creds[uname].shopId === vendorId && creds[uname].zoneId === zoneId) {
            delete creds[uname];
            break;
          }
        }
        localStorage.setItem('tableserve_shop_credentials', JSON.stringify(creds));
      } catch (e) {
        console.error('Error deleting vendor credentials:', e);
      }
    }

    return removed;
  }

  static deleteZoneVendors(zoneId) {
    try {
      const zoneVendorsKey = `${this.KEYS.ZONE_VENDORS}_${zoneId}`;
      localStorage.removeItem(zoneVendorsKey);
      const adminVendorsKey = `tableserve_admin_vendors_${zoneId}`;
      localStorage.removeItem(adminVendorsKey);
      console.log(`Deleted all vendors for zone: ${zoneId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting vendors for zone ${zoneId}:`, error);
      return false;
    }
  }

  // Zone Profile Management
  static getZoneProfile(zoneId) {
    const zones = this.getZones();
    return zones.find(z => z.id == zoneId) || null;
  }

  static updateZoneProfile(zoneId, updates) {
    return this.updateZone(zoneId, updates);
  }

  // Zone Shop Credentials Management
  static saveShopCredentials(shopData) {
    try {
      // Save shop/vendor credentials for login system
      const credentials = localStorage.getItem('tableserve_shop_credentials') || '{}';
      const credentialsData = JSON.parse(credentials);

      if (shopData.loginCredentials) {
        credentialsData[shopData.loginCredentials.username] = {
          shopId: shopData.id,
          zoneId: shopData.zoneId,
          restaurantId: shopData.restaurantId, // Add restaurantId for restaurant owners
          password: shopData.loginCredentials.password,
          shopName: shopData.name,
          ownerName: shopData.ownerName,
          type: shopData.type || 'zone_shop', // 'zone_shop', 'zone_vendor', 'restaurant_owner', 'zone_admin'
          status: shopData.status,
          createdAt: shopData.createdAt || new Date().toISOString(),
          // Include subscription data - this was missing!
          subscription: shopData.subscription || null,
          subscriptionPlan: shopData.subscriptionPlan || null,
          email: shopData.email || shopData.ownerEmail || '',
          phone: shopData.phone || shopData.ownerPhone || ''
        };

        localStorage.setItem('tableserve_shop_credentials', JSON.stringify(credentialsData));
        
        console.log('LocalStorageService: Saved shop credentials with subscription:', {
          username: shopData.loginCredentials.username,
          type: shopData.type,
          subscription: shopData.subscription,
          subscriptionPlan: shopData.subscriptionPlan
        });
      }

      return true;
    } catch (error) {
      console.error('Error saving shop credentials:', error);
      return false;
    }
  }

  static validateShopCredentials(username, password) {
    try {
      const credentials = localStorage.getItem('tableserve_shop_credentials') || '{}';
      const credentialsData = JSON.parse(credentials);

      console.log('LocalStorageService: validateShopCredentials called:', {
        username,
        availableUsernames: Object.keys(credentialsData),
        credentialsCount: Object.keys(credentialsData).length
      });

      const shopCreds = credentialsData[username];
      if (shopCreds) {
        console.log('LocalStorageService: Found credentials for username:', {
          username,
          type: shopCreds.type,
          shopId: shopCreds.shopId,
          restaurantId: shopCreds.restaurantId,
          zoneId: shopCreds.zoneId,
          status: shopCreds.status,
          passwordMatches: shopCreds.password === password
        });
        
        if (shopCreds.password === password && shopCreds.status === 'active') {
          return {
            valid: true,
            shopData: shopCreds
          };
        }
      } else {
        console.log('LocalStorageService: No credentials found for username:', username);
      }

      return { valid: false };
    } catch (error) {
      console.error('Error validating shop credentials:', error);
      return { valid: false };
    }
  }

  static updateShopCredentials(shopId, zoneId, newPassword) {
    try {
      const credentials = localStorage.getItem('tableserve_shop_credentials') || '{}';
      const credentialsData = JSON.parse(credentials);

      // Find and update the shop credentials
      for (const username in credentialsData) {
        if (credentialsData[username].shopId === shopId && credentialsData[username].zoneId === zoneId) {
          credentialsData[username].password = newPassword;
          credentialsData[username].updatedAt = new Date().toISOString();
          break;
        }
      }

      localStorage.setItem('tableserve_shop_credentials', JSON.stringify(credentialsData));
      return true;
    } catch (error) {
      console.error('Error updating shop credentials:', error);
      return false;
    }
  }

  // Zone Categories management
  static getZoneCategories(zoneId) {
    try {
      const key = `zone_menu_categories_${zoneId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const categories = JSON.parse(stored);
        console.log(`LocalStorageService.getZoneCategories for zone ${zoneId}:`, categories);
        return Array.isArray(categories) ? categories : [];
      }

      // Fallback: return some default categories based on menu items in the zone
      const allMenuItems = [];
      const zoneShops = this.getZoneShops(zoneId);
      const zoneVendors = this.getZoneVendors(zoneId);
      const allEntities = [...zoneShops, ...zoneVendors];

      for (const entity of allEntities) {
        const items = this.getMenuItems({ shopId: entity.id, zoneId });
        allMenuItems.push(...items);
      }

      const uniqueCategories = [...new Set(allMenuItems.map(item => item.category).filter(Boolean))];
      const defaultCategories = [
        { id: 'all', name: 'All', description: 'View all menu items', active: true },
        ...uniqueCategories.map((cat, index) => ({
          id: `cat_${index + 1}`,
          name: cat,
          description: `${cat} items`,
          active: true
        }))
      ];

      console.log(`LocalStorageService.getZoneCategories fallback for zone ${zoneId}:`, defaultCategories);
      return defaultCategories;
    } catch (error) {
      console.error('Error getting zone categories:', error);
      return [];
    }
  }

  static saveZoneCategories(zoneId, categories) {
    const key = `zone_menu_categories_${zoneId}`;
    localStorage.setItem(key, JSON.stringify(categories));
  }

  // Restaurant Categories management
  static getRestaurantCategories(restaurantId) {
    try {
      const key = `restaurant_menu_categories_${restaurantId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const categories = JSON.parse(stored);
        console.log(`LocalStorageService.getRestaurantCategories for restaurant ${restaurantId}:`, categories);
        return Array.isArray(categories) ? categories : [];
      }
      return [];
    } catch (error) {
      console.error('Error getting restaurant categories:', error);
      return [];
    }
  }

  static saveRestaurantCategories(restaurantId, categories) {
    const key = `restaurant_menu_categories_${restaurantId}`;
    localStorage.setItem(key, JSON.stringify(categories));
  }

  static saveMenuItems(restaurantId, menuItems) {
    try {
      // Use DataAccessLayer for consistent menu item saving
      const success = dataAccessLayer.saveMenuItems(restaurantId, menuItems, 'restaurant');
      
      if (success) {
        logger.info('Menu items saved successfully', { restaurantId, count: menuItems.length }, 'LocalStorageService');
      }
      
      return success;
    } catch (error) {
      logger.error('Error saving menu items', error, 'LocalStorageService');
      return false;
    }
  }
}

export default LocalStorageService;