const compression = require('compression');

const shouldCompress = (req, res) => {
    if (req.headers['x-no-compression']) {
        return false;
    }
    return compression.filter(req, res);
};

const compressionConfig = compression({
    filter: shouldCompress,
    level: 6, // Default compression level (good balance)
    threshold: 1024 // Only compress responses larger than 1KB
});

module.exports = compressionConfig;