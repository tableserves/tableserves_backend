const authMiddleware = require('../../src/middleware/authMiddleware');
const jwtService = require('../../src/services/jwtService');
const TestHelpers = require('../helpers');

// Mock the JWT service
jest.mock('../../src/services/jwtService');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: '64a7b8c9d0e1f2a3b4c5d6e7',
        email: 'test@example.com',
        role: 'restaurant_owner',
        iat: Math.floor(Date.now() / 1000)
      };

      jwtService.extractTokenFromHeader.mockReturnValue(token);
      jwtService.verifyAccessToken.mockReturnValue(decodedPayload);

      const req = TestHelpers.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      await authMiddleware.authenticate(req, res, next);

      expect(jwtService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${token}`);
      expect(jwtService.verifyAccessToken).toHaveBeenCalledWith(token);
      expect(req.user).toEqual({
        id: decodedPayload.userId,
        email: decodedPayload.email,
        role: decodedPayload.role,
        tokenIat: decodedPayload.iat
      });
      expect(next).toHaveBeenCalled();
    });

    it('should throw error when no token provided', async () => {
      jwtService.extractTokenFromHeader.mockReturnValue(null);

      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      await authMiddleware.authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Access token required');
    });

    it('should handle invalid token', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid token');

      jwtService.extractTokenFromHeader.mockReturnValue(token);
      jwtService.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      const req = TestHelpers.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      await authMiddleware.authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('authorize', () => {
    it('should authorize user with correct role', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'restaurant_owner' })
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authorize('restaurant_owner', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should authorize admin for any role', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authorize('restaurant_owner');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without correct role', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'customer' })
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authorize('restaurant_owner', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authorize('restaurant_owner');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token provided', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: '64a7b8c9d0e1f2a3b4c5d6e7',
        email: 'test@example.com',
        role: 'restaurant_owner',
        iat: Math.floor(Date.now() / 1000)
      };

      jwtService.extractTokenFromHeader.mockReturnValue(token);
      jwtService.verifyAccessToken.mockReturnValue(decodedPayload);

      const req = TestHelpers.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(decodedPayload.userId);
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when no token provided', async () => {
      jwtService.extractTokenFromHeader.mockReturnValue(null);

      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', async () => {
      const token = 'invalid-token';

      jwtService.extractTokenFromHeader.mockReturnValue(token);
      jwtService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = TestHelpers.mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      await authMiddleware.optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate with valid API key', async () => {
      const expectedApiKey = 'valid-api-key';
      const req = TestHelpers.mockRequest({
        headers: { 'x-api-key': expectedApiKey }
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authenticateApiKey(expectedApiKey);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      const expectedApiKey = 'valid-api-key';
      const req = TestHelpers.mockRequest({
        headers: { 'x-api-key': 'invalid-api-key' }
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authenticateApiKey(expectedApiKey);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Invalid API key');
    });

    it('should require API key', async () => {
      const expectedApiKey = 'valid-api-key';
      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.authenticateApiKey(expectedApiKey);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('API key required');
    });
  });

  describe('userRateLimit', () => {
    it('should allow requests within limit', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser()
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.userRateLimit(10, 60000); // 10 requests per minute
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip rate limiting for unauthenticated requests', async () => {
      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.userRateLimit(10, 60000);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkFeatureAccess', () => {
    it('should allow access for admin users', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'admin' })
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.checkFeatureAccess('premium_feature');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for regular users (not implemented yet)', async () => {
      const req = TestHelpers.mockRequest({
        user: TestHelpers.mockUser({ role: 'restaurant_owner' })
      });
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.checkFeatureAccess('premium_feature');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const req = TestHelpers.mockRequest();
      const res = TestHelpers.mockResponse();
      const next = TestHelpers.mockNext();

      const middleware = authMiddleware.checkFeatureAccess('premium_feature');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });
  });
});