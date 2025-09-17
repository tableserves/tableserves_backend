const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const checkDependencies = () => {
  console.log('=== DEPENDENCY AND PROJECT STRUCTURE CHECK ===\n');

  let score = 100;
  const issues = [];

  // 1. Check Package.json
  console.log('1. Checking Package.json...');
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);

      // Check required fields
      const requiredFields = ['name', 'version', 'scripts', 'dependencies'];
      requiredFields.forEach(field => {
        if (!packageJson[field]) {
          console.log(`⚠️ Missing ${field} in package.json`);
          score -= 5;
          issues.push(`Missing ${field} in package.json`);
        }
      });

      // Check scripts
      const requiredScripts = ['start', 'test', 'dev'];
      requiredScripts.forEach(script => {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          console.log(`⚠️ Missing ${script} script`);
          score -= 2;
          issues.push(`Missing ${script} script`);
        }
      });

      // Check dependencies
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const essentialDeps = [
        'express',
        'mongoose',
        'dotenv',
        'cors',
        'helmet',
        'morgan',
        'winston',
        'jsonwebtoken',
        'bcrypt'
      ];

      essentialDeps.forEach(dep => {
        if (!dependencies[dep]) {
          console.log(`⚠️ Missing essential dependency: ${dep}`);
          score -= 2;
          issues.push(`Missing ${dep} dependency`);
        }
      });

      // Check for outdated dependencies
      try {
        console.log('\nChecking for outdated dependencies...');
        const outdated = execSync('npm outdated --json', { cwd: path.join(__dirname, '..') });
        const outdatedDeps = Object.keys(JSON.parse(outdated.toString()));
        if (outdatedDeps.length > 0) {
          console.log(`⚠️ Found ${outdatedDeps.length} outdated dependencies`);
          score -= Math.min(outdatedDeps.length, 10);
          issues.push(`${outdatedDeps.length} outdated dependencies`);
        }
      } catch (error) {
        // If no outdated dependencies, npm outdated exits with code 1
        if (error.status !== 1) {
          console.log('❌ Error checking outdated dependencies');
        } else {
          console.log('✅ All dependencies are up to date');
        }
      }
    } else {
      console.log('❌ package.json not found');
      score -= 30;
      issues.push('Missing package.json');
    }
  } catch (error) {
    console.log('❌ Error checking package.json:', error.message);
  }

  // 2. Check Project Structure
  console.log('\n2. Checking Project Structure...');
  const requiredDirs = [
    'src/controllers',
    'src/models',
    'src/routes',
    'src/middleware',
    'src/services',
    'src/utils',
    'src/config',
    'tests',
    'public',
    'logs'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`⚠️ Missing directory: ${dir}`);
      score -= 3;
      issues.push(`Missing ${dir} directory`);
    } else {
      console.log(`✅ Found ${dir} directory`);
    }
  });

  // 3. Check Configuration Files
  console.log('\n3. Checking Configuration Files...');
  const configFiles = [
    '.env',
    '.env.example',
    '.gitignore',
    'README.md',
    '.eslintrc.js',
    '.prettierrc'
  ];

  configFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Missing file: ${file}`);
      score -= 2;
      issues.push(`Missing ${file}`);
    } else {
      console.log(`✅ Found ${file}`);
    }
  });

  // 4. Check Code Quality Tools
  console.log('\n4. Checking Code Quality Tools...');
  try {
    const packageJson = require(path.join(__dirname, '../package.json'));
    const devDeps = packageJson.devDependencies || {};
    
    const qualityTools = [
      'eslint',
      'prettier',
      'husky',
      'lint-staged'
    ];

    qualityTools.forEach(tool => {
      if (!devDeps[tool]) {
        console.log(`⚠️ Missing code quality tool: ${tool}`);
        score -= 2;
        issues.push(`Missing ${tool}`);
      } else {
        console.log(`✅ Found ${tool}`);
      }
    });
  } catch (error) {
    console.log('❌ Error checking code quality tools:', error.message);
  }

  // 5. Check Git Configuration
  console.log('\n5. Checking Git Configuration...');
  try {
    const gitignorePath = path.join(__dirname, '../.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      const requiredIgnores = [
        'node_modules',
        '.env',
        'logs',
        'coverage',
        'dist',
        'build'
      ];

      requiredIgnores.forEach(ignore => {
        if (!gitignore.includes(ignore)) {
          console.log(`⚠️ Missing ${ignore} in .gitignore`);
          score -= 1;
          issues.push(`Missing ${ignore} in .gitignore`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking git configuration:', error.message);
  }

  // 6. Check Documentation
  console.log('\n6. Checking Documentation...');
  try {
    const readmePath = path.join(__dirname, '../README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf8');
      const requiredSections = [
        'Installation',
        'Usage',
        'API',
        'Configuration',
        'Development'
      ];

      requiredSections.forEach(section => {
        if (!readme.includes(section)) {
          console.log(`⚠️ Missing ${section} section in README`);
          score -= 1;
          issues.push(`Missing ${section} in README`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking documentation:', error.message);
  }

  // Final Score and Recommendations
  console.log('\n=== DEPENDENCY AND STRUCTURE SCORE ===');
  console.log(`Overall Score: ${score}/100`);

  if (issues.length > 0) {
    console.log('\nIdentified Issues:');
    issues.forEach(issue => console.log(`- ${issue}`));
  }

  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Update outdated dependencies');
  console.log('2. Implement all required project directories');
  console.log('3. Add missing configuration files');
  console.log('4. Implement code quality tools');
  console.log('5. Complete project documentation');
  console.log('6. Add git hooks for code quality');
  console.log('7. Implement proper error handling');
  console.log('8. Add security headers');
  console.log('9. Configure proper logging');
  console.log('10. Add API documentation');

  return {
    score,
    issues
  };
};

checkDependencies();