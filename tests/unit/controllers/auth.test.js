
const AuthController = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const { generateTestToken } = require('../../helpers');

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: {}
    };
    res = mockResponse();
    next = jest.fn();
  });

  describe('login', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };
      
      await AuthController.login(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Please provide email and password'
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com' };
      
      await AuthController.login(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Please provide email and password'
      });
    });
  });
});
