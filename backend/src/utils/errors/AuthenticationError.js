
const BaseError = require('./BaseError');

class AuthenticationError extends BaseError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

module.exports = AuthenticationError;
