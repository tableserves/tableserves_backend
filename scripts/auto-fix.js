require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const autoFix = async () => {
  console.log('=== AUTOMATIC ISSUE FIXING ===\n');

  const fixes = [];
  const errors = [];

  // 1. Fix Project Structure
  console.log('1. Fixing Project Structure...');
  const requiredDirs = [
    'src/controllers',
    'src/models',
    'src/routes',
    'src/middleware',
    'src/services',
    'src/utils',
    'src/config',
    'tests/unit',
    'tests/integration',
    'tests/e2e',
    'public',
    'logs'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
        fixes.push(`Created ${dir} directory`);
      } catch (error) {
        console.log(`❌ Failed to create directory ${dir}: ${error.message}`);
        errors.push(`Failed to create ${dir}: ${error.message}`);
      }
    }
  });

  // 2. Fix Configuration Files
  console.log('\n2. Fixing Configuration Files...');

  // Create .env.example if missing
  const envExamplePath = path.join(__dirname, '../.env.example');
  if (!fs.existsSync(envExamplePath)) {
    try {
      const envExample = `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/your_database
DB_NAME=your_database

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE=app.log
`;
      fs.writeFileSync(envExamplePath, envExample);
      console.log('✅ Created .env.example');
      fixes.push('Created .env.example');
    } catch (error) {
      console.log('❌ Failed to create .env.example:', error.message);
      errors.push(`Failed to create .env.example: ${error.message}`);
    }
  }

  // Create .gitignore if missing
  const gitignorePath = path.join(__dirname, '../.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    try {
      const gitignore = `# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs
*.log
npm-debug.log*

# Build output
dist/
build/

# Coverage directory
coverage/

# IDE files
.idea/
.vscode/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
`;
      fs.writeFileSync(gitignorePath, gitignore);
      console.log('✅ Created .gitignore');
      fixes.push('Created .gitignore');
    } catch (error) {
      console.log('❌ Failed to create .gitignore:', error.message);
      errors.push(`Failed to create .gitignore: ${error.message}`);
    }
  }

  // Create README.md if missing
  const readmePath = path.join(__dirname, '../README.md');
  if (!fs.existsSync(readmePath)) {
    try {
      const readme = `# Project Name

## Description
Brief description of your project.

## Installation
\`\`\`bash
npm install
\`\`\`

## Configuration
1. Copy .env.example to .env
2. Update the environment variables in .env

## Usage
\`\`\`bash
# Development
npm run dev

# Production
npm start
\`\`\`

## API Documentation

Detailed API documentation goes here.

## Development

### Running Tests
\`\`\`bash
npm test
\`\`\`

### Code Style
This project uses ESLint and Prettier for code formatting.

## License
MIT
`;
      fs.writeFileSync(readmePath, readme);
      console.log('✅ Created README.md');
      fixes.push('Created README.md');
    } catch (error) {
      console.log('❌ Failed to create README.md:', error.message);
      errors.push(`Failed to create README.md: ${error.message}`);
    }
  }

  // 3. Fix Package.json Scripts
  console.log('\n3. Fixing Package.json Scripts...');
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);
      let modified = false;

      if (!packageJson.scripts) {
        packageJson.scripts = {};
        modified = true;
      }

      const requiredScripts = {
        start: 'node src/server.js',
        dev: 'nodemon src/server.js',
        test: 'jest --coverage',
        'test:watch': 'jest --watch',
        'test:e2e': 'jest --config jest.config.e2e.js',
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        format: 'prettier --write "**/*.{js,json,md}"'
      };

      Object.entries(requiredScripts).forEach(([key, value]) => {
        if (!packageJson.scripts[key]) {
          packageJson.scripts[key] = value;
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Updated package.json scripts');
        fixes.push('Updated package.json scripts');
      }
    }
  } catch (error) {
    console.log('❌ Failed to update package.json:', error.message);
    errors.push(`Failed to update package.json: ${error.message}`);
  }

  // 4. Install Essential Dependencies
  console.log('\n4. Installing Essential Dependencies...');
  const essentialDeps = [
    'express',
    'mongoose',
    'dotenv',
    'cors',
    'helmet',
    'morgan',
    'winston',
    'jsonwebtoken',
    'bcrypt',
    'express-validator',
    'multer',
    'compression'
  ];

  const devDeps = [
    'nodemon',
    'jest',
    'supertest',
    'eslint',
    'prettier',
    'husky',
    'lint-staged'
  ];

  try {
    console.log('Installing production dependencies...');
    execSync(`npm install ${essentialDeps.join(' ')} --save`, { stdio: 'inherit' });
    console.log('✅ Installed production dependencies');
    fixes.push('Installed production dependencies');

    console.log('\nInstalling development dependencies...');
    execSync(`npm install ${devDeps.join(' ')} --save-dev`, { stdio: 'inherit' });
    console.log('✅ Installed development dependencies');
    fixes.push('Installed development dependencies');
  } catch (error) {
    console.log('❌ Failed to install dependencies:', error.message);
    errors.push(`Failed to install dependencies: ${error.message}`);
  }

  // Summary
  console.log('\n=== AUTO-FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review and update the .env file with your configuration');
  console.log('2. Review and customize the README.md');
  console.log('3. Run the test suite to verify the setup');
  console.log('4. Review and customize ESLint and Prettier configurations');
  console.log('5. Set up your database and verify the connection');

  return {
    fixes,
    errors
  };
};

autoFix().catch(console.error);