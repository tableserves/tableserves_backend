import api from '../api/api';
import logger from '../../services/LoggingService';
import simpleTokenService from '../../services/SimpleTokenService';

class AuthService {
  // Authenticate user with real backend API
  static async authenticateUser(credentials, role) {
    const { username, password } = credentials;

    try {
      // Determine if username is email or actual username
      const isEmail = username.includes('@');
      const loginData = {
        password,
        role
      };

      if (isEmail) {
        loginData.email = username;
      } else {
        loginData.username = username;
      }

      const response = await api.post('/auth/login', loginData);

      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken, businessEntity } = response.data.data;

        // Store tokens using simple token service
        const tokenStored = simpleTokenService.storeTokens(accessToken, refreshToken, user);

        if (!tokenStored) {
          throw new Error('Failed to store authentication tokens');
        }

        // Store business entity information if available
        if (businessEntity) {
          localStorage.setItem('tableserve_business_entity', JSON.stringify(businessEntity));
        }

        logger.info('User authenticated successfully', {
          userId: user.id,
          role: user.role,
          businessEntity: businessEntity ? businessEntity.name : null
        });

        return {
          user,
          accessToken,
          refreshToken,
          businessEntity,
          success: true
        };
      } else {
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      logger.error('Authentication failed', error);
      
      // Extract user-friendly error message
      let errorMessage = 'Username or password is incorrect. Please try again.';
      
      if (error.response && error.response.data) {
        const responseData = error.response.data;
        
        // Use the error message from backend (which should now be user-friendly)
        if (responseData.error && responseData.error.message) {
          errorMessage = responseData.error.message;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
        
        // Handle specific status codes if needed
        if (error.response.status === 401) {
          errorMessage = 'Username or password is incorrect. Please check your credentials and try again.';
        } else if (error.response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Our servers are experiencing issues. Please try again in a few moments.';
        }
      } else if (error.message.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Legacy storeTokens method removed - now using SimpleTokenService exclusively

  // Get stored authentication token
  static getStoredToken() {
    return simpleTokenService.getAccessToken();
  }

  // Get stored refresh token
  static getStoredRefreshToken() {
    return simpleTokenService.getRefreshToken();
  }

  // Logout user and clear tokens
  static async logout() {
    try {
      // Get refresh token to send to backend
      const refreshToken = this.getStoredRefreshToken();

      // Call backend logout endpoint with refresh token (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      await api.post('/auth/logout', {
        refreshToken
      }, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      logger.info('Logout API call successful');
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('Logout API call timed out');
      } else {
        logger.warn('Logout API call failed', error);
      }
    } finally {
      // Clear tokens regardless of API call result
      this.clearTokens();
    }
  }

  // Clear stored tokens from all locations
  static clearTokens() {
    // Clear tokens using simple token service
    simpleTokenService.clearTokens();
    localStorage.removeItem('tableserve_refresh_token');
    sessionStorage.removeItem('tableserve_user_data');

    // Clear business entity data
    localStorage.removeItem('tableserve_business_entity');

    // Legacy storage locations
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tableserve_user_data');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('tableserve_access_token');
    sessionStorage.removeItem('tableserve_refresh_token');
    sessionStorage.removeItem('tableserve_user');

    logger.info('All authentication tokens and business data cleared from storage');
  }

  // Verify token with backend
  static async verifyToken(token = null) {
    const authToken = token || this.getStoredToken();
    
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await api.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error('Token verification failed');
      }
    } catch (error) {
      logger.error('Token verification failed', error);
      this.clearTokens();
      throw new Error('Invalid or expired token');
    }
  }

  // Refresh access token using refresh token
  static async refreshAccessToken() {
    const refreshToken = this.getStoredRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    try {
      const response = await api.post('/auth/refresh', {
        refreshToken
      });

      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store tokens using SimpleTokenService
        if (user) {
          simpleTokenService.storeTokens(accessToken, newRefreshToken, user);
        } else {
          // If no user data, we can't store tokens properly - this should not happen
          logger.error('Token refresh succeeded but no user data returned');
          throw new Error('Invalid token refresh response - missing user data');
        }

        logger.info('Access token refreshed successfully', {
          userId: user?.id,
          hasSubscription: !!user?.subscription
        });

        // Return full response data including user information
        return {
          user,
          accessToken,
          refreshToken: newRefreshToken
        };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      logger.error('Token refresh failed', error);
      this.clearTokens();
      throw new Error('Failed to refresh token');
    }
  }

  // Check if user is authenticated
  static async isAuthenticated() {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      // Basic token validation (check if it's not expired)
      const { default: simpleTokenService } = await import('../../services/SimpleTokenService');
      return simpleTokenService.isAuthenticated();
    } catch (error) {
      logger.warn('Token validation failed', error);
      return false;
    }
  }

  // Get current user from stored token
  static async getCurrentUser() {
    try {
      // Import SimpleTokenService instance
      const { default: simpleTokenService } = await import('../../services/SimpleTokenService');
      return simpleTokenService.getUserData();
    } catch (error) {
      logger.warn('Failed to get user data', error);
      return null;
    }
  }

  // Get business entity data
  static getBusinessEntity() {
    try {
      const businessEntityData = localStorage.getItem('tableserve_business_entity');
      return businessEntityData ? JSON.parse(businessEntityData) : null;
    } catch (error) {
      logger.warn('Failed to get business entity data', error);
      return null;
    }
  }

  // Get stored business entity data
  static getBusinessEntity() {
    try {
      const businessEntityData = localStorage.getItem('tableserve_business_entity');
      return businessEntityData ? JSON.parse(businessEntityData) : null;
    } catch (error) {
      logger.warn('Failed to get business entity data', error);
      return null;
    }
  }
  // Register new user (for registration flows)
  static async registerUser(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken } = response.data.data;

        // Store tokens using SimpleTokenService
        const tokenStored = simpleTokenService.storeTokens(accessToken, refreshToken, user);

        if (!tokenStored) {
          throw new Error('Failed to store authentication tokens');
        }

        logger.info('User registered successfully', { userId: user.id, role: user.role });

        return {
          user,
          accessToken,
          refreshToken,
          success: true
        };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      logger.error('Registration failed', error);
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  // Reset password request
  static async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      
      if (response.data.success) {
        logger.info('Password reset requested', { email });
        return {
          success: true,
          message: response.data.message || 'Password reset email sent'
        };
      } else {
        throw new Error(response.data.message || 'Password reset request failed');
      }
    } catch (error) {
      logger.error('Password reset request failed', error);
      throw new Error(error.response?.data?.message || error.message || 'Password reset request failed');
    }
  }

  // Authenticate user with any role (convenience method)
  static async authenticateAnyRole(username, password) {
    try {
      // Determine if username is email or actual username
      const isEmail = username.includes('@');
      const loginData = { password };

      if (isEmail) {
        loginData.email = username;
      } else {
        loginData.username = username;
      }

      // Call the main authenticateUser method without specifying role
      // The backend will determine the role from the user data
      const response = await api.post('/auth/login', loginData);

      if (response.data.success && response.data.data) {
        const { user, accessToken, refreshToken, businessEntity } = response.data.data;

        // Store tokens using SimpleTokenService
        const tokenStored = simpleTokenService.storeTokens(accessToken, refreshToken, user);

        if (!tokenStored) {
          throw new Error('Failed to store authentication tokens');
        }

        // Store business entity information if available
        if (businessEntity) {
          localStorage.setItem('tableserve_business_entity', JSON.stringify(businessEntity));
        }

        logger.info('User authenticated successfully (any role)', {
          userId: user.id,
          role: user.role,
          hasBusinessEntity: !!businessEntity,
          businessType: businessEntity?.type
        });

        return {
          user,
          accessToken,
          refreshToken,
          businessEntity,
          success: true
        };
      } else {
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      logger.error('Authentication failed (any role)', error);
      
      // Extract user-friendly error message using the same logic as the authenticateUser method
      let errorMessage = 'Username or password is incorrect. Please try again.';
      
      if (error.response && error.response.data) {
        const responseData = error.response.data;
        
        // Use the error message from backend (which should now be user-friendly)
        if (responseData.error && responseData.error.message) {
          errorMessage = responseData.error.message;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
        
        // Handle specific status codes if needed
        if (error.response.status === 401) {
          errorMessage = 'Username or password is incorrect. Please check your credentials and try again.';
        } else if (error.response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Invalid Credentials';
        }
      } else if (error.message.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // NOTE: Token generation is handled by the backend only
  // Frontend should never generate JWT tokens for security reasons
}

export default AuthService;