const fs = require("fs");
const path = require("path");

const auditMiddleware = () => {
  const middlewareDir = path.join(__dirname, "../src/middleware");
  const middlewareFiles = fs
    .readdirSync(middlewareDir)
    .filter((f) => f.endsWith(".js"));

  console.log("=== MIDDLEWARE AUDIT ===");

  middlewareFiles.forEach((file) => {
    try {
      const middlewarePath = path.join(middlewareDir, file);
      const middleware = require(middlewarePath);

      console.log(`✅ ${file}:`);
      Object.keys(middleware).forEach((key) => {
        console.log(`   ${key}: ${typeof middleware[key]}`);
      });
    } catch (error) {
      console.log(`❌ ${file}: ERROR - ${error.message}`);
    }
  });
};

auditMiddleware();