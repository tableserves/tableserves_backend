const { createStream } = require('rotating-file-stream');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Create rotating write stream
const accessLogStream = createStream('access.log', {
    interval: '1d', // rotate daily
    path: logDir,
    size: '10M', // rotate when size exceeds 10MB
    compress: 'gzip' // compress rotated files
});

module.exports = accessLogStream;