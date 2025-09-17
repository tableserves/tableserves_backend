const NodeCache = require('node-cache');
const { logger } = require('../utils/logger');

// Create cache instance with default TTL of 10 minutes and check period of 15 minutes
const cache = new NodeCache({
    stdTTL: 600,
    checkperiod: 900,
    useClones: false
});

logger.info('Cache initialized.');

// Cache middleware
const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = req.originalUrl;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            logger.info(`Cache hit for key: ${key}`);
            res.send(cachedResponse);
            return;
        }

        logger.info(`Cache miss for key: ${key}`);
        // Store the original send function
        const originalSend = res.send;

        // Override the send function
        res.send = function(body) {
            // Restore the original send function
            res.send = originalSend;

            // Cache the response
            cache.set(key, body, duration);

            // Send the response
            return originalSend.call(this, body);
        };

        next();
    };
};

module.exports = {
    cache,
    cacheMiddleware
};