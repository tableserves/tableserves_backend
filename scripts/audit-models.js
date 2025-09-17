const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const auditModels = () => {
  const modelsDir = path.join(__dirname, "../src/models");
  const modelFiles = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js"));

  console.log("=== MODEL AUDIT ===");

  modelFiles.forEach((file) => {
    try {
      const modelPath = path.join(modelsDir, file);
      const model = require(modelPath);

      console.log(
        `✅ ${file}: ${typeof model} - ${model.modelName || "Unknown"}`
      );

      // Check if it's a valid Mongoose model
      if (model.schema) {
        console.log(
          `   Schema paths: ${Object.keys(model.schema.paths)
            .slice(0, 5)
            .join(", ")}...`
        );
      }
    } catch (error) {
      console.log(`❌ ${file}: ERROR - ${error.message}`);
    }
  });
};

auditModels();