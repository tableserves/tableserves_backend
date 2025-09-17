const fs = require("fs");
const path = require("path");

const auditServices = () => {
  const servicesDir = path.join(__dirname, "../src/services");

  console.log("=== SERVICES AUDIT ===");

  try {
    const uploadService = require("../src/services/uploadService");
    console.log("uploadService exports:", Object.keys(uploadService));

    if (uploadService.uploadMiddleware) {
      console.log(
        "uploadMiddleware type:",
        typeof uploadService.uploadMiddleware
      );
      console.log(
        "uploadMiddleware.multiple type:",
        typeof uploadService.uploadMiddleware.multiple
      );
    }

    if (uploadService.UploadService) {
      console.log(
        "UploadService methods:",
        Object.getOwnPropertyNames(uploadService.UploadService)
      );
    }
  } catch (error) {
    console.log("❌ uploadService ERROR:", error.message);
  }

  // Audit other services
  try {
    const services = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
    services.forEach(service => {
      if (service !== 'uploadService.js') {
        try {
          const servicePath = path.join(servicesDir, service);
          const serviceModule = require(servicePath);
          console.log(`\n✅ ${service}:`);
          console.log('Exports:', Object.keys(serviceModule));
        } catch (error) {
          console.log(`❌ ${service} ERROR:`, error.message);
        }
      }
    });
  } catch (error) {
    console.log("❌ Services directory scan ERROR:", error.message);
  }
};

auditServices();