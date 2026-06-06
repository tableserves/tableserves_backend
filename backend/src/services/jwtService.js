const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

/**
 * Validate JWT configuration
 */
const validateJWTConfig = () => {
  const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new APIError(`Missing JWT configuration: ${missing.join(', ')}`, 500);
  }

  // Check JWT secret length for security
  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters long for security');
  }
};

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT access token
 */
const generateAccessToken = (payload) => {
  try {
    validateJWTConfig();
    
    const accessTokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '3y', // Re-enabled expiration
        issuer: 'tableserve-api',
        audience: 'tableserve-client'
      }
    );

    logger.debug('Access token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new APIError('Failed to generate access token', 500);
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    validateJWTConfig();
    
    const refreshTokenPayload = {
      userId: payload.userId,
      tokenId: crypto.randomUUID(),
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '3y', // Re-enabled expiration
        issuer: 'tableserve-api',
        audience: 'tableserve-client'
      }
    );

    logger.debug('Refresh token generated', { userId: payload.userId, tokenId: refreshTokenPayload.tokenId });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new APIError('Failed to generate refresh token', 500);
  }
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @returns {Object} - Token pair
 */
const generateTokenPair = (user) => {
  try {
    const payload = {
      userId: user._id || user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info('Token pair generated', { 
      userId: payload.userId, 
      role: payload.role 
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRE || '15m',
      tokenType: 'Bearer'
    };
  } catch (error) {
    logger.error('Error generating token pair:', error);
    throw error;
  }
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    validateJWTConfig();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'tableserve-api',
      audience: 'tableserve-client'
    });

    if (decoded.type !== 'access') {
      throw new APIError('Invalid token type', 401);
    }

    logger.debug('Access token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Access token expired');
      throw new APIError('Access token expired', 401);
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token provided');
      throw new APIError('Invalid access token', 401);
    } else {
      logger.error('Error verifying access token:', error);
      throw error;
    }
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    validateJWTConfig();
    
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'tableserve-api',
      audience: 'tableserve-client'
    });

    if (decoded.type !== 'refresh') {
      throw new APIError('Invalid token type', 401);
    }

    logger.debug('Refresh token verified', { 
      userId: decoded.userId, 
      tokenId: decoded.tokenId 
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Refresh token expired');
      throw new APIError('Refresh token expired', 401);
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid refresh token provided');
      throw new APIError('Invalid refresh token', 401);
    } else {
      logger.error('Error verifying refresh token:', error);
      throw error;
    }
  }
};

/**
 * Decode token without verification (for expired token info)
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    logger.error('Error decoding token:', error);
    throw new APIError('Invalid token format', 400);
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date} - Expiration date
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (decoded && decoded.payload && decoded.payload.exp) {
      return new Date(decoded.payload.exp * 1000);
    }
    return null;
  } catch (error) {
    logger.error('Error getting token expiration:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - Is token expired
 */
const isTokenExpired = (token) => {
  try {
    const expiration = getTokenExpiration(token);
    // If no expiration set, token never expires
    if (!expiration) return false;
    
    return new Date() > expiration;
  } catch (error) {
    return true;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Generate secure token for email verification, password reset, etc.
 * @param {number} length - Token length (default: 32)
 * @returns {string} - Secure random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token for storage (for email verification, password reset)
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  extractTokenFromHeader,
  generateSecureToken,
  hashToken,
  validateJWTConfig
};