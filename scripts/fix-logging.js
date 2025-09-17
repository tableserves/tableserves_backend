require('dotenv').config();
const fs = require('fs');
const path = require('path');

const validateAndFixLogging = async () => {
    console.log('=== LOGGING VALIDATION AND FIXES ===\n');

    const fixes = [];
    const errors = [];

    // 1. Create Logger Configuration
    console.log('1. Setting up Logger Configuration...');
    const loggerPath = path.join(__dirname, '../src/utils/logger.js');
    const loggerContent = `
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => \`\${info.timestamp} \${info.level}: \${info.message}\`
    )
);

// Define file paths
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define transports
const transports = [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error'
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
        filename: path.join(logDir, 'combined.log')
    })
];

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console()
    );
}

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports
});

module.exports = logger;
`;

    try {
        // Ensure the directory exists before writing the file
        const loggerDir = path.dirname(loggerPath);
        if (!fs.existsSync(loggerDir)) {
            fs.mkdirSync(loggerDir, { recursive: true });
        }
        fs.writeFileSync(loggerPath, loggerContent.trim());
        console.log('✅ Created logger configuration');
        fixes.push('Created logger configuration');
    } catch (error) {
        console.error('❌ Failed to create logger configuration:', error.message);
        errors.push(`Failed to create logger configuration: ${error.message}`);
    }

    // 2. Create HTTP Logger Middleware
    console.log('\n2. Setting up HTTP Logger Middleware...');
    const httpLoggerPath = path.join(__dirname, '../src/middleware/httpLogger.js');
    const httpLoggerContent = `
const morgan = require('morgan');
const logger = require('../utils/logger');

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
`;

    try {
        const httpLoggerDir = path.dirname(httpLoggerPath);
        if (!fs.existsSync(httpLoggerDir)) {
            fs.mkdirSync(httpLoggerDir, { recursive: true });
        }
        fs.writeFileSync(httpLoggerPath, httpLoggerContent.trim());
        console.log('✅ Created HTTP logger middleware');
        fixes.push('Created HTTP logger middleware');
    } catch (error) {
        console.error('❌ Failed to create HTTP logger middleware:', error.message);
        errors.push(`Failed to create HTTP logger middleware: ${error.message}`);
    }

    // 3. Update Error Handler with Logging
    console.log('\n3. Updating Error Handler with Logging...');
    const errorHandlerPath = path.join(__dirname, '../src/middleware/errorHandler.js');

    if (fs.existsSync(errorHandlerPath)) {
        try {
            let errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf8');
            let modified = false;

            // Add logger import if missing
            if (!errorHandlerContent.includes("require('../utils/logger')")) {
                errorHandlerContent = `const logger = require('../utils/logger');\n${errorHandlerContent}`;
                modified = true;
            }

            // Add error logging if missing
            if (!errorHandlerContent.includes('logger.error')) {
                errorHandlerContent = errorHandlerContent.replace(
                    /console\.error\s*\(([^)]+)\);/g, // More robust regex to find console.error
                    "logger.error('Unhandled Error:', { error: err.message, stack: err.stack });"
                );
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(errorHandlerPath, errorHandlerContent);
                console.log('✅ Updated error handler with logging');
                fixes.push('Updated error handler with logging');
            } else {
                console.log('☑️ Error handler already contains logging logic. No changes needed.');
            }
        } catch (error) {
            console.error('❌ Failed to update error handler:', error.message);
            errors.push(`Failed to update error handler: ${error.message}`);
        }
    } else {
         console.warn('⚠️  Warning: Error handler not found. Skipping update.');
    }

    // 4. Update App.js with HTTP Logger
    console.log('\n4. Updating App.js with HTTP Logger...');
    const appPath = path.join(__dirname, '../src/app.js'); // Assuming app.js is in src

    if (fs.existsSync(appPath)) {
        try {
            let appContent = fs.readFileSync(appPath, 'utf8');
            let modified = false;

            // Add logger imports if missing
            if (!appContent.includes("require('./middleware/httpLogger')")) {
                appContent = `const httpLogger = require('./middleware/httpLogger');\n${appContent}`;
                modified = true;
            }

            // Add HTTP logger middleware if missing
            if (!appContent.includes('app.use(httpLogger)')) {
                // Correctly look for the line without a newline character
                const targetLine = 'app.use(express.json());';
                const expressJsonIndex = appContent.indexOf(targetLine);

                if (expressJsonIndex !== -1) {
                    const insertPosition = expressJsonIndex + targetLine.length;
                    appContent = appContent.slice(0, insertPosition) +
                        '\napp.use(httpLogger);' +
                        appContent.slice(insertPosition);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(appPath, appContent);
                console.log('✅ Updated App.js with HTTP logger');
                fixes.push('Updated App.js with HTTP logger');
            } else {
                console.log('☑️ App.js already includes HTTP logger. No changes needed.');
            }
        } catch (error) {
            console.error('❌ Failed to update App.js:', error.message);
            errors.push(`Failed to update App.js: ${error.message}`);
        }
    } else {
        console.warn('⚠️  Warning: app.js not found. Skipping update.');
    }

    // 5. Create Log Rotation Configuration
    console.log('\n5. Setting up Log Rotation...');
    const logRotatePath = path.join(__dirname, '../src/utils/logRotate.js');
    const logRotateContent = `
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
`;

    try {
        const logRotateDir = path.dirname(logRotatePath);
        if (!fs.existsSync(logRotateDir)) {
            fs.mkdirSync(logRotateDir, { recursive: true });
        }
        fs.writeFileSync(logRotatePath, logRotateContent.trim());
        console.log('✅ Created log rotation configuration');
        fixes.push('Created log rotation configuration');
    } catch (error) {
        console.error('❌ Failed to create log rotation configuration:', error.message);
        errors.push(`Failed to create log rotation configuration: ${error.message}`);
    }

    // Summary
    console.log('\n=== LOGGING FIX SUMMARY ===');
    console.log(`\nFixed Items (${fixes.length}):`);
    fixes.forEach(fix => console.log(`✅ ${fix}`));

    if (errors.length > 0) {
        console.log(`\nErrors (${errors.length}):`);
        errors.forEach(error => console.log(`❌ ${error}`));
    }

    console.log('\n=== NEXT STEPS ===');
    console.log('1. Install required packages: npm install winston morgan rotating-file-stream');
    console.log('2. Review and customize log formats for your needs');
    console.log('3. Set up log monitoring and alerting (e.g., PM2, Datadog)');
    console.log('4. Configure log retention policies for your server');
    console.log('5. Test logging in different environments (development, production)');

    return {
        fixes,
        errors
    };
};

validateAndFixLogging().catch(console.error);
