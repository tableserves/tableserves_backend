const express = require("express");
const path = require("path");
const fs = require("fs");

const auditRoutes = () => {
  console.log("=== ROUTES AUDIT ===");

  try {
    const routesDir = path.join(__dirname, "../src/routes");
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

    routeFiles.forEach((file) => {
      try {
        const routePath = path.join(routesDir, file);
        delete require.cache[require.resolve(routePath)]; // Clear cache
        const router = require(routePath);

        console.log(`\n✅ ${file}: ${typeof router}`);

        if (router && router.stack) {
          console.log(`   Routes count: ${router.stack.length}`);
          
          // Analyze route stack
          router.stack.forEach((layer, index) => {
            if (layer.route) {
              const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
              console.log(`   ${index + 1}. ${methods} ${layer.route.path}`);
              
              // Check middleware count
              const middlewareCount = layer.route.stack.length;
              console.log(`      Middleware count: ${middlewareCount}`);
            }
          });
        }

        // Special check for specific route files
        if (file === 'menuRoutes.js') {
          console.log('\n   MenuRoutes specific checks:');
          console.log('   - Authentication middleware present:', 
            router.stack.some(layer => 
              layer.name === 'authenticate' || 
              (layer.route && layer.route.stack.some(r => r.name === 'authenticate'))
            )
          );
        }
      } catch (error) {
        console.log(`❌ ${file}: ERROR - ${error.message}`);
        console.log(`   Stack: ${error.stack.split("\n")[0]}`);
      }
    });
  } catch (error) {
    console.log("Route audit failed:", error.message);
  }
};

auditRoutes();