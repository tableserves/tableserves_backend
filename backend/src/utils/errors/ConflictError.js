
const BaseError = require('./BaseError');

class ConflictError extends BaseError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

module.exports = ConflictError;
