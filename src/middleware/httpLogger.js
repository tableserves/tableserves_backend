const morgan = require('morgan');
const { logger } = require('../utils/logger');

// Create a custom morgan token for request body
morgan.token('body', (req) => JSON.stringify(req.body));

// Create stream for morgan
const stream = {
    write: (message) => logger.http(message.trim())
};

// Skip logging in test environment
const skip = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'test';
};

// Custom format
const format = '[:date[clf]] :method :url :status :response-time ms - :res[content-length] :body';

// Create middleware
const httpLogger = morgan(format, { stream, skip });

module.exports = httpLogger;