require('dotenv').config();
const fs = require('fs');
const path = require('path');

const validateAndFixPerformance = async () => {
    console.log('=== PERFORMANCE VALIDATION AND FIXES ===\n');

    const fixes = [];
    const errors = [];

    // --- Create Directories Function ---
    const ensureDirectoryExists = (filePath) => {
        const dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        ensureDirectoryExists(dirname);
        fs.mkdirSync(dirname);
    };


    // 1. Database Performance Optimization
    console.log('1. Setting up Database Performance Optimization...');

    const dbConfigPath = path.join(__dirname, '../src/config/database.js');
    const dbConfigContent = `
const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming logger exists

const connectDB = async () => {
    const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: process.env.NODE_ENV === 'development', // Only create indexes in development
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
    };

    try {
        const conn = await mongoose.connect(process.env.DATABASE_URI || process.env.MONGODB_URI, options);
        logger.info(\`MongoDB Connected: \${conn.connection.host}\`);
        return conn;
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = { connectDatabase: connectDB };
`;

    try {
        ensureDirectoryExists(dbConfigPath);
        fs.writeFileSync(dbConfigPath, dbConfigContent.trim());
        console.log('✅ Created database configuration');
        fixes.push('Created database configuration');
    } catch (error) {
        console.error('❌ Failed to create database configuration:', error.message);
        errors.push(`Failed to create database configuration: ${error.message}`);
    }

    // 2. Caching Configuration
    console.log('\n2. Setting up Caching Configuration...');
    const cacheConfigPath = path.join(__dirname, '../src/config/cache.js');
    const cacheConfigContent = `
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

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
            logger.info(\`Cache hit for key: \${key}\`);
            res.send(cachedResponse);
            return;
        }

        logger.info(\`Cache miss for key: \${key}\`);
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
`;

    try {
        ensureDirectoryExists(cacheConfigPath);
        fs.writeFileSync(cacheConfigPath, cacheConfigContent.trim());
        console.log('✅ Created caching configuration');
        fixes.push('Created caching configuration');
    } catch (error) {
        console.error('❌ Failed to create caching configuration:', error.message);
        errors.push(`Failed to create caching configuration: ${error.message}`);
    }

    // 3. Compression Configuration
    console.log('\n3. Setting up Compression Configuration...');
    const compressionConfigPath = path.join(__dirname, '../src/config/compression.js');
    const compressionConfigContent = `
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
`;

    try {
        ensureDirectoryExists(compressionConfigPath);
        fs.writeFileSync(compressionConfigPath, compressionConfigContent.trim());
        console.log('✅ Created compression configuration');
        fixes.push('Created compression configuration');
    } catch (error) {
        console.error('❌ Failed to create compression configuration:', error.message);
        errors.push(`Failed to create compression configuration: ${error.message}`);
    }

    // 4. Query Optimization Middleware
    console.log('\n4. Setting up Query Optimization Middleware...');
    const queryOptimizerPath = path.join(__dirname, '../src/middleware/queryOptimizer.js');
    const queryOptimizerContent = `
const queryOptimizer = (defaultLimit = 10, maxLimit = 100) => {
    return (req, res, next) => {
        // Parse query parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(
            parseInt(req.query.limit, 10) || defaultLimit,
            maxLimit
        );
        const sort = req.query.sort || '-createdAt';
        const fields = req.query.fields ? req.query.fields.split(',').join(' ') : '';

        // Add query options to request object
        req.queryOptions = {
            page,
            limit,
            skip: (page - 1) * limit,
            sort,
            fields
        };

        next();
    };
};

module.exports = queryOptimizer;
`;

    try {
        ensureDirectoryExists(queryOptimizerPath);
        fs.writeFileSync(queryOptimizerPath, queryOptimizerContent.trim());
        console.log('✅ Created query optimization middleware');
        fixes.push('Created query optimization middleware');
    } catch (error) {
        console.error('❌ Failed to create query optimization middleware:', error.message);
        errors.push(`Failed to create query optimization middleware: ${error.message}`);
    }

    // 5. Update App.js with Performance Configurations
    console.log('\n5. Updating App.js with Performance Configurations...');
    const appPath = path.join(__dirname, '../src/app.js');

    if (fs.existsSync(appPath)) {
        try {
            let appContent = fs.readFileSync(appPath, 'utf8');
            let modified = false;

            const importsToAdd = {
                compression: "const compression = require('./config/compression');",
                cacheMiddleware: "const { cacheMiddleware } = require('./config/cache');",
                queryOptimizer: "const queryOptimizer = require('./middleware/queryOptimizer');"
            };

            for (const key in importsToAdd) {
                if (!appContent.includes(importsToAdd[key])) {
                    appContent = `${importsToAdd[key]}\n${appContent}`;
                    modified = true;
                }
            }

            const performanceMiddlewareBlock = `
// Performance middleware
app.use(compression);
app.use(queryOptimizer());

// Example of caching a specific route for 5 minutes
// app.use('/api/v1/some-public-route', cacheMiddleware(300));
`;

            if (!appContent.includes('app.use(compression);')) {
                const targetLine = 'app.use(express.json());';
                const insertionPoint = appContent.indexOf(targetLine);
                if (insertionPoint !== -1) {
                    const endOfLine = insertionPoint + targetLine.length;
                    appContent = appContent.slice(0, endOfLine) + performanceMiddlewareBlock + appContent.slice(endOfLine);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(appPath, appContent);
                console.log('✅ Updated App.js with performance configurations');
                fixes.push('Updated App.js with performance configurations');
            } else {
                console.log('☑️ App.js already contains performance configurations. No changes needed.');
            }
        } catch (error) {
            console.error('❌ Failed to update App.js:', error.message);
            errors.push(`Failed to update App.js: ${error.message}`);
        }
    } else {
        console.warn('⚠️  Warning: app.js not found. Skipping update.');
    }

    // Summary
    console.log('\n=== PERFORMANCE FIX SUMMARY ===');
    console.log(`\nFixed Items (${fixes.length}):`);
    fixes.forEach(fix => console.log(`✅ ${fix}`));

    if (errors.length > 0) {
        console.log(`\nErrors (${errors.length}):`);
        errors.forEach(error => console.log(`❌ ${error}`));
    }

    console.log('\n=== NEXT STEPS ===');
    console.log('1. Install required packages: npm install mongoose node-cache compression');
    console.log('2. Review your .env file and add the MONGODB_URI or DATABASE_URI variable.');
    console.log('3. In your app.js or server.js, replace the existing mongoose.connect with the new connectDatabase function.');
    console.log('4. Apply the `cacheMiddleware` to specific GET routes that you want to cache.');
    console.log('5. Monitor database query performance and add indexes to your Mongoose schemas for frequently queried fields.');
    console.log('6. Set up performance monitoring tools (e.g., New Relic, PM2) and run load tests.');

    return {
        fixes,
        errors
    };
};

validateAndFixPerformance().catch(console.error);
