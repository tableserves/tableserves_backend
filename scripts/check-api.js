const express = require('express');
const path = require('path');
const fs = require('fs');

const checkAPI = () => {
  console.log('=== API ENDPOINTS CHECK ===\n');

  const routesDir = path.join(__dirname, '../src/routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

  // Expected endpoint patterns
  const expectedPatterns = {
    get: /^\/?[\w-]+(?:\/:[\w-]+)*\/?$/,    // e.g., /users, /users/:id
    post: /^\/?[\w-]+(?:\/:[\w-]+)*\/?$/,   // e.g., /users, /orders
    put: /^\/?[\w-]+\/:[\w-]+\/?$/,        // e.g., /users/:id
    patch: /^\/?[\w-]+\/:[\w-]+\/?$/,      // e.g., /users/:id
    delete: /^\/?[\w-]+\/:[\w-]+\/?$/      // e.g., /users/:id
  };

  // Common middleware names to check for
  const expectedMiddleware = {
    authentication: ['authenticate', 'isAuthenticated', 'requireAuth'],
    validation: ['validate', 'validateBody', 'validateQuery'],
    authorization: ['authorize', 'isAuthorized', 'checkPermission'],
    errorHandling: ['errorHandler', 'catchAsync', 'asyncHandler']
  };

  let totalEndpoints = 0;
  let validEndpoints = 0;
  let warnings = 0;

  routeFiles.forEach(file => {
    console.log(`\nChecking ${file}...`);
    
    try {
      const routePath = path.join(routesDir, file);
      delete require.cache[require.resolve(routePath)]; // Clear cache
      const router = require(routePath);

      if (router && router.stack) {
        router.stack.forEach((layer, index) => {
          if (layer.route) {
            totalEndpoints++;
            const route = layer.route;
            const methods = Object.keys(route.methods);
            const path = route.path;
            const middlewareStack = route.stack;

            console.log(`\n  Endpoint ${index + 1}:`);
            console.log(`  Path: ${path}`);
            console.log(`  Methods: ${methods.join(', ').toUpperCase()}`);

            // Check path pattern
            let isValidPattern = false;
            methods.forEach(method => {
              if (expectedPatterns[method] && expectedPatterns[method].test(path)) {
                isValidPattern = true;
              }
            });

            if (isValidPattern) {
              console.log('  ✅ Valid path pattern');
              validEndpoints++;
            } else {
              console.log('  ⚠️ Unusual path pattern');
              warnings++;
            }

            // Check middleware
            const middlewareNames = middlewareStack.map(m => m.name || 'anonymous');
            console.log('  Middleware stack:', middlewareNames.join(', '));

            // Check for essential middleware
            let hasAuth = false;
            let hasValidation = false;
            let hasErrorHandling = false;

            middlewareNames.forEach(name => {
              if (expectedMiddleware.authentication.some(m => name.includes(m))) hasAuth = true;
              if (expectedMiddleware.validation.some(m => name.includes(m))) hasValidation = true;
              if (expectedMiddleware.errorHandling.some(m => name.includes(m))) hasErrorHandling = true;
            });

            // Report middleware findings
            if (!hasAuth && methods.some(m => ['post', 'put', 'delete', 'patch'].includes(m))) {
              console.log('  ⚠️ Missing authentication middleware');
              warnings++;
            }

            if (!hasValidation && methods.some(m => ['post', 'put', 'patch'].includes(m))) {
              console.log('  ⚠️ Missing validation middleware');
              warnings++;
            }

            if (!hasErrorHandling) {
              console.log('  ⚠️ Missing error handling middleware');
              warnings++;
            }

            // Special checks for specific routes
            if (path.includes('upload')) {
              const hasMulterMiddleware = middlewareNames.some(name => 
                name.includes('multer') || name.includes('upload')
              );
              if (!hasMulterMiddleware) {
                console.log('  ⚠️ Upload route missing file handling middleware');
                warnings++;
              }
            }
          }
        });
      }
    } catch (error) {
      console.log(`❌ Error analyzing ${file}: ${error.message}`);
    }
  });

  // Summary
  console.log('\n=== API CHECK SUMMARY ===');
  console.log(`Total endpoints found: ${totalEndpoints}`);
  console.log(`Valid endpoints: ${validEndpoints}`);
  console.log(`Warnings: ${warnings}`);

  if (warnings > 0) {
    console.log('\n⚠️ Some endpoints may need improvement');
    console.log('Consider addressing the warnings above to improve API robustness');
  } else if (totalEndpoints === validEndpoints) {
    console.log('\n✅ All endpoints follow best practices');
  }

  // Recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Ensure all protected routes have authentication middleware');
  console.log('2. Add input validation for POST/PUT/PATCH endpoints');
  console.log('3. Implement proper error handling for all routes');
  console.log('4. Use consistent naming conventions for endpoints');
  console.log('5. Consider rate limiting for public endpoints');
};

checkAPI();