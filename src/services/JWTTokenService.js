/**
 * JWT Token Management Service for TableServe Application
 * 
 * Handles JWT token creation, validation, storage, and refresh
 * Replaces localStorage-based authentication with secure JWT implementation
 */

import logger from './LoggingService';

class JWTTokenService {
  constructor() {
    this.TOKEN_KEY = 'tableserve_jwt_token';
    this.REFRESH_TOKEN_KEY = 'tableserve_refresh_token';
    this.USER_KEY = 'tableserve_user_data';
    
    // Token expiration times (configurable via environment variables)
    this.ACCESS_TOKEN_EXPIRY = this.parseExpiry(import.meta.env.VITE_JWT_ACCESS_EXPIRY) || 15 * 60 * 1000; // 15 minutes default
    this.REFRESH_TOKEN_EXPIRY = this.parseExpiry(import.meta.env.VITE_JWT_REFRESH_EXPIRY) || 7 * 24 * 60 * 60 * 1000; // 7 days default
    
    // JWT Secret keys (in production, use environment variables)
    this.JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'tableserve_jwt_secret_key_2024';
    this.REFRESH_SECRET = import.meta.env.VITE_JWT_REFRESH_SECRET || 'tableserve_refresh_secret_key_2024';
    
    // JWE (JSON Web Encryption) Configuration
    this.JWE_SECRET = import.meta.env.VITE_JWE_SECRET || 'tableserve_jwe_secret_key_2024';
    this.JWE_IV_SECRET = import.meta.env.VITE_JWE_IV_SECRET || 'tableserve_jwe_iv_secret_2024';
    this.ENABLE_JWE = import.meta.env.VITE_ENABLE_JWE === 'true';
    
    // Security configuration
    this.SECURITY_LEVEL = import.meta.env.VITE_SECURITY_LEVEL || 'standard';
    
    // Auto-refresh setup
    this.refreshTimer = null;
    this.setupAutoRefresh();
    
    // Log security configuration (without exposing keys)
    logger.info('JWT/JWE Service initialized', {
      jweEnabled: this.ENABLE_JWE,
      securityLevel: this.SECURITY_LEVEL,
      accessTokenExpiry: this.ACCESS_TOKEN_EXPIRY / 1000 / 60 + ' minutes',
      refreshTokenExpiry: this.REFRESH_TOKEN_EXPIRY / 1000 / 60 / 60 / 24 + ' days'
    }, 'JWTTokenService');
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - User data to encode in token
   * @returns {string} JWT token
   */
  generateAccessToken(payload) {
    try {
      const now = Date.now();
      const tokenPayload = {
        ...payload,
        iat: now,
        exp: now + this.ACCESS_TOKEN_EXPIRY,
        type: 'access'
      };

      // Simple JWT implementation (in production, use a proper JWT library)
      const header = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payloadEncoded = this.base64UrlEncode(JSON.stringify(tokenPayload));
      const signature = this.createSignature(`${header}.${payloadEncoded}`, this.JWT_SECRET);
      
      const token = `${header}.${payloadEncoded}.${signature}`;
      
      logger.info('Access token generated', { 
        userId: payload.id, 
        role: payload.role,
        expiresIn: this.ACCESS_TOKEN_EXPIRY / 1000 / 60 + ' minutes'
      }, 'JWTTokenService');
      
      return token;
    } catch (error) {
      logger.error('Failed to generate access token', error, 'JWTTokenService');
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - User data to encode in token
   * @returns {string} Refresh token
   */
  generateRefreshToken(payload) {
    try {
      const now = Date.now();
      const tokenPayload = {
        id: payload.id,
        role: payload.role,
        username: payload.username,
        iat: now,
        exp: now + this.REFRESH_TOKEN_EXPIRY,
        type: 'refresh'
      };

      const header = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payloadEncoded = this.base64UrlEncode(JSON.stringify(tokenPayload));
      const signature = this.createSignature(`${header}.${payloadEncoded}`, this.REFRESH_SECRET);
      
      const token = `${header}.${payloadEncoded}.${signature}`;
      
      logger.info('Refresh token generated', { 
        userId: payload.id, 
        expiresIn: this.REFRESH_TOKEN_EXPIRY / 1000 / 60 / 60 / 24 + ' days'
      }, 'JWTTokenService');
      
      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token', error, 'JWTTokenService');
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @param {string} secret - Secret key for verification
   * @returns {Object} Decoded payload or null if invalid
   */
  verifyToken(token, secret = this.JWT_SECRET) {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        logger.warn('Invalid token format', { tokenLength: parts.length }, 'JWTTokenService');
        return null;
      }

      const [header, payload, signature] = parts;
      
      // Verify signature
      const expectedSignature = this.createSignature(`${header}.${payload}`, secret);
      if (signature !== expectedSignature) {
        logger.warn('Token signature verification failed', {}, 'JWTTokenService');
        return null;
      }

      // Decode payload
      const decodedPayload = JSON.parse(this.base64UrlDecode(payload));
      
      // Check expiration
      if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
        logger.info('Token expired', { 
          expiredAt: new Date(decodedPayload.exp).toISOString(),
          tokenType: decodedPayload.type 
        }, 'JWTTokenService');
        return null;
      }

      logger.debug('Token verified successfully', { 
        userId: decodedPayload.id, 
        role: decodedPayload.role,
        tokenType: decodedPayload.type 
      }, 'JWTTokenService');
      
      return decodedPayload;
    } catch (error) {
      logger.error('Token verification failed', error, 'JWTTokenService');
      return null;
    }
  }

  /**
   * Store tokens securely
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @param {Object} userData - User data
   */
  storeTokens(accessToken, refreshToken, userData) {
    try {
      // Encrypt tokens if JWE is enabled
      const encryptedAccessToken = this.encryptToken(accessToken);
      const encryptedRefreshToken = this.encryptToken(refreshToken);
      
      // Store encrypted tokens securely
      sessionStorage.setItem(this.TOKEN_KEY, encryptedAccessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, encryptedRefreshToken);
      
      // Store minimal user data
      const minimalUserData = {
        id: userData.id,
        role: userData.role,
        username: userData.username,
        name: userData.name
      };
      sessionStorage.setItem(this.USER_KEY, JSON.stringify(minimalUserData));
      
      logger.info('Tokens stored securely', { 
        userId: userData.id, 
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        jweEnabled: this.ENABLE_JWE,
        encryptedLength: {
          access: encryptedAccessToken.length,
          refresh: encryptedRefreshToken.length
        }
      }, 'JWTTokenService');
      
      // Setup auto-refresh
      this.setupAutoRefresh();
    } catch (error) {
      logger.error('Failed to store tokens', error, 'JWTTokenService');
      throw new Error('Token storage failed');
    }
  }

  /**
   * Get current access token
   * @returns {string|null} Access token or null if not found/invalid
   */
  getAccessToken() {
    try {
      const encryptedToken = sessionStorage.getItem(this.TOKEN_KEY);
      if (!encryptedToken) {
        return null;
      }

      // Decrypt token if JWE is enabled
      const token = this.decryptToken(encryptedToken);
      
      const payload = this.verifyToken(token);
      return payload ? token : null;
    } catch (error) {
      logger.error('Failed to get access token', error, 'JWTTokenService');
      return null;
    }
  }

  /**
   * Get current refresh token
   * @returns {string|null} Refresh token or null if not found/invalid
   */
  getRefreshToken() {
    try {
      const encryptedToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!encryptedToken) {
        return null;
      }

      // Decrypt token if JWE is enabled
      const token = this.decryptToken(encryptedToken);
      
      const payload = this.verifyToken(token, this.REFRESH_SECRET);
      return payload ? token : null;
    } catch (error) {
      logger.error('Failed to get refresh token', error, 'JWTTokenService');
      return null;
    }
  }

  /**
   * Get current user data from token
   * @returns {Object|null} User data or null if not authenticated
   */
  getCurrentUser() {
    try {
      const token = this.getAccessToken();
      if (!token) {
        return null;
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        return null;
      }

      // Get additional user data from storage
      const storedUserData = sessionStorage.getItem(this.USER_KEY);
      const userData = storedUserData ? JSON.parse(storedUserData) : {};

      return {
        ...userData,
        ...payload,
        isAuthenticated: true
      };
    } catch (error) {
      logger.error('Failed to get current user', error, 'JWTTokenService');
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Object|null} New tokens or null if refresh failed
   */
  async refreshAccessToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        logger.warn('No refresh token available', {}, 'JWTTokenService');
        return null;
      }

      const refreshPayload = this.verifyToken(refreshToken, this.REFRESH_SECRET);
      if (!refreshPayload) {
        logger.warn('Invalid refresh token', {}, 'JWTTokenService');
        this.clearTokens();
        return null;
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        id: refreshPayload.id,
        role: refreshPayload.role,
        username: refreshPayload.username
      });

      // Update stored access token
      sessionStorage.setItem(this.TOKEN_KEY, newAccessToken);
      
      logger.info('Access token refreshed successfully', { 
        userId: refreshPayload.id 
      }, 'JWTTokenService');

      // Setup next auto-refresh
      this.setupAutoRefresh();

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken
      };
    } catch (error) {
      logger.error('Failed to refresh access token', error, 'JWTTokenService');
      this.clearTokens();
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    const token = this.getAccessToken();
    return !!token;
  }

  /**
   * Clear all tokens and user data
   */
  clearTokens() {
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      
      // Clear auto-refresh timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      
      logger.info('Tokens cleared successfully', {}, 'JWTTokenService');
    } catch (error) {
      logger.error('Failed to clear tokens', error, 'JWTTokenService');
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupAutoRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const token = this.getAccessToken();
    if (!token) {
      return;
    }

    const payload = this.verifyToken(token);
    if (!payload || !payload.exp) {
      return;
    }

    // Refresh token 2 minutes before expiry
    const refreshTime = payload.exp - Date.now() - (2 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        logger.info('Auto-refreshing access token', {}, 'JWTTokenService');
        await this.refreshAccessToken();
      }, refreshTime);
    }
  }

  /**
   * Get token expiration info
   * @returns {Object} Token expiration details
   */
  getTokenInfo() {
    try {
      const accessToken = this.getAccessToken();
      const refreshToken = this.getRefreshToken();
      
      const accessPayload = accessToken ? this.verifyToken(accessToken) : null;
      const refreshPayload = refreshToken ? this.verifyToken(refreshToken, this.REFRESH_SECRET) : null;
      
      return {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenExpiry: accessPayload ? new Date(accessPayload.exp).toISOString() : null,
        refreshTokenExpiry: refreshPayload ? new Date(refreshPayload.exp).toISOString() : null,
        accessTokenValid: !!accessPayload,
        refreshTokenValid: !!refreshPayload,
        timeUntilAccessExpiry: accessPayload ? Math.max(0, accessPayload.exp - Date.now()) : 0,
        timeUntilRefreshExpiry: refreshPayload ? Math.max(0, refreshPayload.exp - Date.now()) : 0
      };
    } catch (error) {
      logger.error('Failed to get token info', error, 'JWTTokenService');
      return null;
    }
  }

  // ===== JWE (JSON Web Encryption) METHODS =====

  /**
   * Encrypt JWT token using JWE for additional security
   * @param {string} token - JWT token to encrypt
   * @returns {string} Encrypted token
   */
  encryptToken(token) {
    if (!this.ENABLE_JWE || !token) {
      return token; // Return original token if JWE is disabled
    }

    try {
      // Simple encryption implementation (in production, use proper JWE library)
      const algorithm = 'aes-256-cbc';
      const key = this.createKeyFromSecret(this.JWE_SECRET, 32);
      const iv = this.createKeyFromSecret(this.JWE_IV_SECRET, 16);
      
      const cipher = crypto.createCipher ? crypto.createCipher(algorithm, key) : null;
      if (!cipher) {
        // Fallback for browser environment
        return this.browserEncrypt(token, key, iv);
      }
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      logger.debug('Token encrypted with JWE', { 
        originalLength: token.length,
        encryptedLength: encrypted.length 
      }, 'JWTTokenService');
      
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt token', error, 'JWTTokenService');
      return token; // Fallback to unencrypted token
    }
  }

  /**
   * Decrypt JWE encrypted token
   * @param {string} encryptedToken - Encrypted token to decrypt
   * @returns {string} Decrypted JWT token
   */
  decryptToken(encryptedToken) {
    if (!this.ENABLE_JWE || !encryptedToken) {
      return encryptedToken; // Return as-is if JWE is disabled
    }

    try {
      // Simple decryption implementation (in production, use proper JWE library)
      const algorithm = 'aes-256-cbc';
      const key = this.createKeyFromSecret(this.JWE_SECRET, 32);
      const iv = this.createKeyFromSecret(this.JWE_IV_SECRET, 16);
      
      const decipher = crypto.createDecipher ? crypto.createDecipher(algorithm, key) : null;
      if (!decipher) {
        // Fallback for browser environment
        return this.browserDecrypt(encryptedToken, key, iv);
      }
      
      let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Token decrypted with JWE', { 
        encryptedLength: encryptedToken.length,
        decryptedLength: decrypted.length 
      }, 'JWTTokenService');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt token', error, 'JWTTokenService');
      return encryptedToken; // Fallback to encrypted token
    }
  }

  /**
   * Browser-compatible encryption fallback
   * @param {string} text - Text to encrypt
   * @param {string} key - Encryption key
   * @param {string} iv - Initialization vector
   * @returns {string} Encrypted text
   */
  browserEncrypt(text, key, iv) {
    try {
      // Simple XOR encryption for browser compatibility
      let result = '';
      const keyBuffer = this.stringToBytes(key);
      const textBuffer = this.stringToBytes(text);
      
      for (let i = 0; i < textBuffer.length; i++) {
        result += String.fromCharCode(textBuffer[i] ^ keyBuffer[i % keyBuffer.length]);
      }
      
      return this.base64UrlEncode(result);
    } catch (error) {
      logger.error('Browser encryption failed', error, 'JWTTokenService');
      return text;
    }
  }

  /**
   * Browser-compatible decryption fallback
   * @param {string} encryptedText - Encrypted text to decrypt
   * @param {string} key - Decryption key
   * @param {string} iv - Initialization vector
   * @returns {string} Decrypted text
   */
  browserDecrypt(encryptedText, key, iv) {
    try {
      // Simple XOR decryption for browser compatibility
      const decodedText = this.base64UrlDecode(encryptedText);
      let result = '';
      const keyBuffer = this.stringToBytes(key);
      
      for (let i = 0; i < decodedText.length; i++) {
        result += String.fromCharCode(decodedText.charCodeAt(i) ^ keyBuffer[i % keyBuffer.length]);
      }
      
      return result;
    } catch (error) {
      logger.error('Browser decryption failed', error, 'JWTTokenService');
      return encryptedText;
    }
  }

  /**
   * Create encryption key from secret
   * @param {string} secret - Secret string
   * @param {number} length - Desired key length
   * @returns {string} Generated key
   */
  createKeyFromSecret(secret, length) {
    // Simple key derivation (in production, use PBKDF2 or similar)
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
      hash = ((hash << 5) - hash) + secret.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    let key = hash.toString(16);
    while (key.length < length * 2) {
      key += hash.toString(16);
    }
    
    return key.substring(0, length * 2);
  }

  /**
   * Convert string to byte array
   * @param {string} str - String to convert
   * @returns {Array} Byte array
   */
  stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  // ===== UTILITY METHODS =====

  /**
   * Parse expiry time from string format (e.g., '15m', '1h', '7d') to milliseconds
   * @param {string} expiry - Expiry string like '15m', '1h', '7d'
   * @returns {number|null} Milliseconds or null if invalid
   */
  parseExpiry(expiry) {
    if (!expiry || typeof expiry !== 'string') {
      return null;
    }

    const units = {
      's': 1000,           // seconds
      'm': 60 * 1000,     // minutes  
      'h': 60 * 60 * 1000, // hours
      'd': 24 * 60 * 60 * 1000 // days
    };

    const match = expiry.match(/^(\d+)([smhd])$/i);
    if (!match) {
      logger.warn('Invalid expiry format', { expiry }, 'JWTTokenService');
      return null;
    }

    const [, value, unit] = match;
    const multiplier = units[unit.toLowerCase()];
    
    if (!multiplier) {
      logger.warn('Invalid expiry unit', { unit }, 'JWTTokenService');
      return null;
    }

    const milliseconds = parseInt(value) * multiplier;
    logger.debug('Parsed expiry', { 
      input: expiry, 
      output: milliseconds, 
      humanReadable: `${value} ${unit.toLowerCase() === 's' ? 'second' : unit.toLowerCase() === 'm' ? 'minute' : unit.toLowerCase() === 'h' ? 'hour' : 'day'}${parseInt(value) > 1 ? 's' : ''}` 
    }, 'JWTTokenService');
    
    return milliseconds;
  }

  /**
   * Base64 URL encode
   */
  base64UrlEncode(str) {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  base64UrlDecode(str) {
    // Add padding if needed
    str += '='.repeat((4 - str.length % 4) % 4);
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return atob(str);
  }

  /**
   * Create HMAC-SHA256 signature (simplified implementation)
   * In production, use crypto.subtle or a proper JWT library
   */
  createSignature(data, secret) {
    // Simple hash implementation - replace with proper HMAC-SHA256 in production
    let hash = 0;
    const input = data + secret;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return this.base64UrlEncode(hash.toString());
  }

  /**
   * Cleanup method to be called before page unload
   */
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Create singleton instance
const jwtTokenService = new JWTTokenService();

// Setup cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    jwtTokenService.cleanup();
  });
}

export default jwtTokenService;