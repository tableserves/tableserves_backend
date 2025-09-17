require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const validateAndFixDependencies = async () => {
  console.log('=== DEPENDENCY MANAGEMENT VALIDATION AND FIXES ===\n');

  const fixes = [];
  const errors = [];

  // 1. Package.json Validation and Fixes
  console.log('1. Validating Package.json...');
  const packageJsonPath = path.join(__dirname, '../package.json');

  try {
    let packageJson = {};
    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    }

    // Required fields
    const requiredFields = {
      name: 'tableserve',
      version: '1.0.0',
      description: 'TableServe Backend API',
      main: 'src/server.js',
      author: '',
      license: 'ISC',
      private: true
    };

    // Required scripts
    const requiredScripts = {
      start: 'node src/server.js',
      dev: 'nodemon src/server.js',
      test: 'jest --coverage',
      'test:watch': 'jest --watch',
      'test:e2e': 'jest --config jest.config.e2e.js',
      lint: 'eslint .',
      'lint:fix': 'eslint . --fix',
      format: 'prettier --write "**/*.{js,json,md}"',
      prepare: 'husky install'
    };

    // Required dependencies
    const requiredDependencies = {
      'bcryptjs': '^2.4.3',
      'compression': '^1.7.4',
      'cors': '^2.8.5',
      'dotenv': '^16.0.3',
      'express': '^4.18.2',
      'express-rate-limit': '^6.7.0',
      'express-validator': '^7.0.1',
      'helmet': '^7.0.0',
      'hpp': '^0.2.3',
      'jsonwebtoken': '^9.0.0',
      'mongoose': '^7.0.3',
      'morgan': '^1.10.0',
      'multer': '^1.4.5-lts.1',
      'node-cache': '^5.1.2',
      'winston': '^3.8.2'
    };

    // Required dev dependencies
    const requiredDevDependencies = {
      '@types/jest': '^29.5.0',
      'eslint': '^8.38.0',
      'eslint-config-prettier': '^8.8.0',
      'husky': '^8.0.3',
      'jest': '^29.5.0',
      'lint-staged': '^13.2.1',
      'mongodb-memory-server': '^8.12.2',
      'nodemon': '^2.0.22',
      'prettier': '^2.8.7',
      'supertest': '^6.3.3'
    };

    let modified = false;

    // Update required fields
    Object.entries(requiredFields).forEach(([key, value]) => {
      if (!packageJson[key]) {
        packageJson[key] = value;
        modified = true;
      }
    });

    // Update scripts
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    Object.entries(requiredScripts).forEach(([key, value]) => {
      if (!packageJson.scripts[key]) {
        packageJson.scripts[key] = value;
        modified = true;
      }
    });

    // Update dependencies
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    Object.entries(requiredDependencies).forEach(([key, value]) => {
      if (!packageJson.dependencies[key]) {
        packageJson.dependencies[key] = value;
        modified = true;
      }
    });

    // Update dev dependencies
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    Object.entries(requiredDevDependencies).forEach(([key, value]) => {
      if (!packageJson.devDependencies[key]) {
        packageJson.devDependencies[key] = value;
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Updated package.json');
      fixes.push('Updated package.json');

      // Install dependencies
      console.log('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Installed dependencies');
      fixes.push('Installed dependencies');
    }
  } catch (error) {
    console.error('❌ Failed to update package.json:', error.message);
    errors.push(`Failed to update package.json: ${error.message}`);
  }

  // 2. ESLint Configuration
  console.log('\n2. Setting up ESLint Configuration...');
  const eslintConfigPath = path.join(__dirname, '../.eslintrc.js');
  const eslintConfigContent = `
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error'
  }
};
`;

  try {
    fs.writeFileSync(eslintConfigPath, eslintConfigContent);
    console.log('✅ Created ESLint configuration');
    fixes.push('Created ESLint configuration');
  } catch (error) {
    console.error('❌ Failed to create ESLint configuration:', error.message);
    errors.push(`Failed to create ESLint configuration: ${error.message}`);
  }

  // 3. Prettier Configuration
  console.log('\n3. Setting up Prettier Configuration...');
  const prettierConfigPath = path.join(__dirname, '../.prettierrc');
  const prettierConfigContent = `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}`;

  try {
    fs.writeFileSync(prettierConfigPath, prettierConfigContent);
    console.log('✅ Created Prettier configuration');
    fixes.push('Created Prettier configuration');
  } catch (error) {
    console.error('❌ Failed to create Prettier configuration:', error.message);
    errors.push(`Failed to create Prettier configuration: ${error.message}`);
  }

  // 4. Husky Configuration
  console.log('\n4. Setting up Husky Configuration...');
  const huskyDir = path.join(__dirname, '../.husky');
  const preCommitPath = path.join(huskyDir, 'pre-commit');

  try {
    if (!fs.existsSync(huskyDir)) {
      fs.mkdirSync(huskyDir);
    }

    const preCommitContent = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint-staged
`;

    fs.writeFileSync(preCommitPath, preCommitContent);
    fs.chmodSync(preCommitPath, 0o755);
    console.log('✅ Created Husky pre-commit hook');
    fixes.push('Created Husky pre-commit hook');
  } catch (error) {
    console.error('❌ Failed to create Husky configuration:', error.message);
    errors.push(`Failed to create Husky configuration: ${error.message}`);
  }

  // 5. lint-staged Configuration
  console.log('\n5. Setting up lint-staged Configuration...');
  const lintStagedConfigPath = path.join(__dirname, '../.lintstagedrc');
  const lintStagedConfigContent = `{
  "*.js": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}`;

  try {
    fs.writeFileSync(lintStagedConfigPath, lintStagedConfigContent);
    console.log('✅ Created lint-staged configuration');
    fixes.push('Created lint-staged configuration');
  } catch (error) {
    console.error('❌ Failed to create lint-staged configuration:', error.message);
    errors.push(`Failed to create lint-staged configuration: ${error.message}`);
  }

  // Summary
  console.log('\n=== DEPENDENCY MANAGEMENT FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review and customize ESLint rules');
  console.log('2. Review and customize Prettier configuration');
  console.log('3. Initialize Husky hooks with: npm run prepare');
  console.log('4. Test the pre-commit hook');
  console.log('5. Update dependencies regularly');

  return {
    fixes,
    errors
  };
};

validateAndFixDependencies().catch(console.error);