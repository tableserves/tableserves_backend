
const BaseError = require('./BaseError');

class AuthorizationError extends BaseError {
  constructor(message = 'Not authorized') {
    super(message, 403);
  }
}

module.exports = AuthorizationError;
