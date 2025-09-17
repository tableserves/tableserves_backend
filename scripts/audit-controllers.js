const fs = require("fs");
const path = require("path");

const auditControllers = () => {
  const controllersDir = path.join(__dirname, "../src/controllers");
  const controllerFiles = fs
    .readdirSync(controllersDir)
    .filter((f) => f.endsWith(".js"));

  console.log("=== CONTROLLERS AUDIT ===");

  controllerFiles.forEach((file) => {
    try {
      const controllerPath = path.join(controllersDir, file);
      const controller = require(controllerPath);

      console.log(`\n✅ ${file}:`);

      if (typeof controller === "function") {
        console.log("   Type: Class/Function");
        console.log(
          "   Static methods:",
          Object.getOwnPropertyNames(controller).filter(
            (name) =>
              typeof controller[name] === "function" && name !== "constructor"
          )
        );
      } else if (typeof controller === "object") {
        console.log("   Type: Object");
        Object.keys(controller).forEach((key) => {
          console.log(`   ${key}: ${typeof controller[key]}`);
        });
      }

      // Special check for ZoneShopController
      if (file === 'zoneShopController.js') {
        const requiredMethods = [
          'getZoneShops',
          'getShop',
          'createShop',
          'updateShop',
          'deleteShop',
          'updateShopStatus',
          'uploadImages',
          'getShopStats',
          'searchShops',
          'getTopRatedShops'
        ];

        console.log('\n   Required ZoneShop methods check:');
        requiredMethods.forEach(method => {
          const exists = typeof controller[method] === 'function' ||
                        (controller.prototype && typeof controller.prototype[method] === 'function');
          console.log(`   ${exists ? '✅' : '❌'} ${method}`);
        });
      }
    } catch (error) {
      console.log(`❌ ${file}: ERROR - ${error.message}`);
    }
  });
};

auditControllers();