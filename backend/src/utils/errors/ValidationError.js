
const BaseError = require('./BaseError');

class ValidationError extends BaseError {
  constructor(message = 'Invalid input data') {
    super(message, 400);
  }
}

module.exports = ValidationError;
