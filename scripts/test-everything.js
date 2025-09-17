const express = require("express");
const path = require("path");
const fs = require("fs");

const testEverything = async () => {
  console.log("=== COMPLETE SYSTEM TEST ===\n");

  try {
    // Test 1: Database Models
    console.log("1. Testing Models...");
    const modelsDir = path.join(__dirname, "../src/models");
    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

    for (const file of modelFiles) {
      try {
        const modelPath = path.join(modelsDir, file);
        const model = require(modelPath);
        console.log(`   ✅ ${file}: ${model.modelName || 'Unknown model name'}`);
        if (model.schema) {
          console.log(`      Schema fields: ${Object.keys(model.schema.paths).join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ ${file}: ${error.message}`);
      }
    }

    // Test 2: Middleware Functions
    console.log("\n2. Testing Middleware...");
    const middlewareDir = path.join(__dirname, "../src/middleware");
    const middlewareFiles = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.js'));

    for (const file of middlewareFiles) {
      try {
        const middlewarePath = path.join(middlewareDir, file);
        const middleware = require(middlewarePath);
        console.log(`   ✅ ${file}:`);
        Object.keys(middleware).forEach(key => {
          console.log(`      ${key}: ${typeof middleware[key]}`);
        });
      } catch (error) {
        console.log(`   ❌ ${file}: ${error.message}`);
      }
    }

    // Test 3: Services
    console.log("\n3. Testing Services...");
    const servicesDir = path.join(__dirname, "../src/services");
    const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));

    for (const file of serviceFiles) {
      try {
        const servicePath = path.join(servicesDir, file);
        const service = require(servicePath);
        console.log(`   ✅ ${file}:`);
        console.log(`      Exports: ${Object.keys(service).join(', ')}`);
      } catch (error) {
        console.log(`   ❌ ${file}: ${error.message}`);
      }
    }

    // Test 4: Controllers
    console.log("\n4. Testing Controllers...");
    const controllersDir = path.join(__dirname, "../src/controllers");
    const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

    for (const file of controllerFiles) {
      try {
        const controllerPath = path.join(controllersDir, file);
        const controller = require(controllerPath);
        console.log(`   ✅ ${file}:`);
        
        if (typeof controller === 'function') {
          console.log('      Type: Class/Function');
          const methods = Object.getOwnPropertyNames(controller)
            .filter(name => typeof controller[name] === 'function' && name !== 'constructor');
          console.log(`      Methods: ${methods.join(', ')}`);
        } else if (typeof controller === 'object') {
          console.log('      Type: Object');
          console.log(`      Methods: ${Object.keys(controller).join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ ${file}: ${error.message}`);
      }
    }

    // Test 5: Routes
    console.log("\n5. Testing Routes...");
    const routesDir = path.join(__dirname, "../src/routes");
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

    const app = express();
    for (const file of routeFiles) {
      try {
        const routePath = path.join(routesDir, file);
        delete require.cache[require.resolve(routePath)]; // Clear cache
        const router = require(routePath);
        app.use(`/test-${file.replace('.js', '')}`, router);
        
        console.log(`   ✅ ${file}:`);
        if (router && router.stack) {
          console.log(`      Routes registered: ${router.stack.length}`);
          router.stack.forEach((layer, index) => {
            if (layer.route) {
              const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
              console.log(`      ${index + 1}. ${methods} ${layer.route.path}`);
            }
          });
        }
      } catch (error) {
        console.log(`   ❌ ${file}: ${error.message}`);
      }
    }

    // Test 6: Configuration Files
    console.log("\n6. Testing Configuration...");
    const configDir = path.join(__dirname, "../src/config");
    if (fs.existsSync(configDir)) {
      const configFiles = fs.readdirSync(configDir).filter(f => f.endsWith('.js'));
      for (const file of configFiles) {
        try {
          const configPath = path.join(configDir, file);
          const config = require(configPath);
          console.log(`   ✅ ${file}: Configuration loaded`);
          console.log(`      Exports: ${Object.keys(config).join(', ')}`);
        } catch (error) {
          console.log(`   ❌ ${file}: ${error.message}`);
        }
      }
    } else {
      console.log("   ⚠️ Config directory not found");
    }

    console.log("\n🎉 ALL TESTS COMPLETED!");

  } catch (error) {
    console.log(`\n❌ TEST FAILED: ${error.message}`);
    console.log(`Stack: ${error.stack.split("\n").slice(0, 3).join("\n")}`);

    // Provide helpful suggestions based on error type
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log("\n💡 SUGGESTION: Check if all required dependencies are installed");
      console.log("   Run: npm install");
    } else if (error.message.includes('undefined')) {
      console.log("\n💡 SUGGESTION: Check if all modules are properly exported");
    }
  }
};

testEverything();