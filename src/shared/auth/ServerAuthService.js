/**
 * Server-Side Authentication Service
 * Handles authentication entirely through server-side sessions
 * No localStorage or sessionStorage usage
 */

import api from '../api/api';
import logger from '../../services/LoggingService';
import simpleTokenService from './SimpleTokenService';

class ServerAuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    
    // Configure axios to include credentials for session-based auth
    api.defaults.withCredentials = true;
    
    logger.info('ServerAuthService initialized - using server-side sessions only');
  }

  /**
   * Authenticate user with server-side session
   */
  async login(credentials) {
    try {
      const { username, password } = credentials;
      
      // Determine if username is email or actual username
      const isEmail = username.includes('@');
      const loginData = {
        password
      };

      if (isEmail) {
        loginData.email = username;
      } else {
        loginData.username = username;
      }

      logger.info('ServerAuthService: Attempting login', { 
        isEmail, 
        username: isEmail ? loginData.email : loginData.username 
      });

      const response = await api.post('/auth/login', loginData);

      if (response.data.success && response.data.data) {
        const { user } = response.data.data;
        
        // Store user data in memory only
        this.currentUser = user;
        this.isAuthenticated = true;

        logger.info('ServerAuthService: Login successful', {
          userId: user.id,
          role: user.role,
          email: user.email
        });

        return {
          user,
          success: true
        };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      this.currentUser = null;
      this.isAuthenticated = false;
      
      logger.error('ServerAuthService: Login failed', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  /**
   * Register new user with server-side session
   */
  async register(userData) {
    try {
      logger.info('ServerAuthService: Attempting registration', { 
        email: userData.email,
        role: userData.role 
      });

      const response = await api.post('/auth/register', userData);
      
      if (response.data.success && response.data.data) {
        const { user } = response.data.data;

        // Store user data in memory only
        this.currentUser = user;
        this.isAuthenticated = true;

        logger.info('ServerAuthService: Registration successful', {
          userId: user.id,
          role: user.role,
          email: user.email
        });

        return {
          user,
          success: true
        };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      this.currentUser = null;
      this.isAuthenticated = false;
      
      logger.error('ServerAuthService: Registration failed', error);
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  /**
   * Get current user from server
   */
  async getCurrentUser() {
    try {
      // First check if we have any stored tokens
      const hasTokens = simpleTokenService.isAuthenticated();

      if (!hasTokens) {
        // No tokens stored, user is not authenticated
        this.currentUser = null;
        this.isAuthenticated = false;
        return null;
      }

      // We have tokens, try to get user profile
      const response = await api.get('/auth/profile');

      if (response.data.success && response.data.data && response.data.data.user) {
        const user = response.data.data.user;

        // Update memory cache
        this.currentUser = user;
        this.isAuthenticated = true;

        return user;
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
        return null;
      }
    } catch (error) {
      this.currentUser = null;
      this.isAuthenticated = false;

      // If it's a 401 error, clear tokens as they're invalid
      if (error.response?.status === 401) {
        simpleTokenService.clearTokens();
      }

      logger.warn('ServerAuthService: Failed to get current user', error);
      return null;
    }
  }

  /**
   * Logout user and clear server session
   */
  async logout() {
    try {
      await api.post('/auth/logout');
      
      // Clear memory cache
      this.currentUser = null;
      this.isAuthenticated = false;
      
      logger.info('ServerAuthService: Logout successful');
      return true;
    } catch (error) {
      // Clear memory cache even if server call fails
      this.currentUser = null;
      this.isAuthenticated = false;
      
      logger.error('ServerAuthService: Logout failed', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated (from memory cache)
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  /**
   * Get cached user data (from memory)
   */
  getCachedUser() {
    return this.currentUser;
  }

  /**
   * Refresh authentication status from server
   */
  async refreshAuthStatus() {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Clear all authentication data
   */
  clearAuth() {
    this.currentUser = null;
    this.isAuthenticated = false;
    logger.info('ServerAuthService: Authentication data cleared');
  }
}

// Create and export singleton instance
const serverAuthService = new ServerAuthService();
export default serverAuthService;
