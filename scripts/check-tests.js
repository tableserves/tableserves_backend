const fs = require('fs');
const path = require('path');

const checkTests = () => {
  console.log('=== TEST COVERAGE CHECK ===\n');

  let score = 100;
  const issues = [];

  // 1. Check Test Directory Structure
  console.log('1. Checking Test Directory Structure...');
  const testDir = path.join(__dirname, '../tests');
  const srcDir = path.join(__dirname, '../src');

  try {
    if (fs.existsSync(testDir)) {
      console.log('✅ Test directory exists');

      // Check for test categories
      const expectedDirs = ['unit', 'integration', 'e2e'];
      expectedDirs.forEach(dir => {
        const dirPath = path.join(testDir, dir);
        if (!fs.existsSync(dirPath)) {
          console.log(`⚠️ Missing ${dir} test directory`);
          score -= 5;
          issues.push(`Missing ${dir} tests directory`);
        } else {
          console.log(`✅ Found ${dir} test directory`);
        }
      });
    } else {
      console.log('❌ Test directory not found');
      score -= 30;
      issues.push('No test directory');
    }
  } catch (error) {
    console.log('❌ Error checking test directory:', error.message);
  }

  // 2. Check Test Configuration
  console.log('\n2. Checking Test Configuration...');
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);
      
      // Check test scripts
      if (!packageJson.scripts || !Object.keys(packageJson.scripts).some(s => s.includes('test'))) {
        console.log('⚠️ No test scripts found in package.json');
        score -= 10;
        issues.push('Missing test scripts');
      } else {
        console.log('✅ Test scripts found');
      }

      // Check test dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const testFrameworks = ['jest', 'mocha', 'chai', 'supertest'];
      const hasTestFramework = testFrameworks.some(fw => deps[fw]);

      if (!hasTestFramework) {
        console.log('⚠️ No testing framework found');
        score -= 10;
        issues.push('Missing test framework');
      } else {
        console.log('✅ Testing framework found');
      }
    }
  } catch (error) {
    console.log('❌ Error checking test configuration:', error.message);
  }

  // 3. Check Test Coverage for Models
  console.log('\n3. Checking Model Tests...');
  try {
    const modelsDir = path.join(srcDir, 'models');
    const modelTestsDir = path.join(testDir, 'unit/models');

    if (fs.existsSync(modelsDir) && fs.existsSync(modelTestsDir)) {
      const models = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
      const modelTests = fs.readdirSync(modelTestsDir).filter(f => f.endsWith('.test.js'));

      const coverage = (modelTests.length / models.length) * 100;
      console.log(`Model test coverage: ${coverage.toFixed(1)}%`);

      if (coverage < 80) {
        score -= Math.round((80 - coverage) / 10);
        issues.push('Low model test coverage');
      }

      // Check test content
      modelTests.forEach(testFile => {
        const content = fs.readFileSync(path.join(modelTestsDir, testFile), 'utf8');
        
        // Check for essential test cases
        if (!content.includes('describe(')) {
          console.log(`⚠️ No test suites in ${testFile}`);
          score -= 2;
          issues.push(`Missing test suites in ${testFile}`);
        }

        if (!content.match(/it\s*\(|test\s*\(/)) {
          console.log(`⚠️ No test cases in ${testFile}`);
          score -= 2;
          issues.push(`Missing test cases in ${testFile}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking model tests:', error.message);
  }

  // 4. Check Controller Tests
  console.log('\n4. Checking Controller Tests...');
  try {
    const controllersDir = path.join(srcDir, 'controllers');
    const controllerTestsDir = path.join(testDir, 'unit/controllers');

    if (fs.existsSync(controllersDir) && fs.existsSync(controllerTestsDir)) {
      const controllers = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
      const controllerTests = fs.readdirSync(controllerTestsDir).filter(f => f.endsWith('.test.js'));

      const coverage = (controllerTests.length / controllers.length) * 100;
      console.log(`Controller test coverage: ${coverage.toFixed(1)}%`);

      if (coverage < 80) {
        score -= Math.round((80 - coverage) / 10);
        issues.push('Low controller test coverage');
      }

      // Check for mocking
      controllerTests.forEach(testFile => {
        const content = fs.readFileSync(path.join(controllerTestsDir, testFile), 'utf8');
        if (!content.match(/mock|stub|spy/i)) {
          console.log(`⚠️ No mocking found in ${testFile}`);
          score -= 2;
          issues.push(`Missing mocks in ${testFile}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking controller tests:', error.message);
  }

  // 5. Check Integration Tests
  console.log('\n5. Checking Integration Tests...');
  try {
    const integrationTestsDir = path.join(testDir, 'integration');
    if (fs.existsSync(integrationTestsDir)) {
      const integrationTests = fs.readdirSync(integrationTestsDir).filter(f => f.endsWith('.test.js'));
      
      if (integrationTests.length === 0) {
        console.log('⚠️ No integration tests found');
        score -= 10;
        issues.push('Missing integration tests');
      } else {
        console.log(`Found ${integrationTests.length} integration test files`);
        
        // Check for API testing
        integrationTests.forEach(testFile => {
          const content = fs.readFileSync(path.join(integrationTestsDir, testFile), 'utf8');
          if (!content.includes('supertest')) {
            console.log(`⚠️ No API testing found in ${testFile}`);
            score -= 2;
            issues.push(`Missing API tests in ${testFile}`);
          }
        });
      }
    }
  } catch (error) {
    console.log('❌ Error checking integration tests:', error.message);
  }

  // 6. Check E2E Tests
  console.log('\n6. Checking E2E Tests...');
  try {
    const e2eTestsDir = path.join(testDir, 'e2e');
    if (fs.existsSync(e2eTestsDir)) {
      const e2eTests = fs.readdirSync(e2eTestsDir).filter(f => f.endsWith('.test.js'));
      
      if (e2eTests.length === 0) {
        console.log('⚠️ No E2E tests found');
        score -= 5;
        issues.push('Missing E2E tests');
      } else {
        console.log(`Found ${e2eTests.length} E2E test files`);
      }
    }
  } catch (error) {
    console.log('❌ Error checking E2E tests:', error.message);
  }

  // Final Score and Recommendations
  console.log('\n=== TEST COVERAGE SCORE ===');
  console.log(`Overall Score: ${score}/100`);

  if (issues.length > 0) {
    console.log('\nIdentified Issues:');
    issues.forEach(issue => console.log(`- ${issue}`));
  }

  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Implement unit tests for all models');
  console.log('2. Add controller tests with proper mocking');
  console.log('3. Create integration tests for API endpoints');
  console.log('4. Implement E2E tests for critical flows');
  console.log('5. Add test coverage reporting');
  console.log('6. Implement continuous integration testing');
  console.log('7. Add performance tests');
  console.log('8. Implement security testing');
  console.log('9. Add load testing');
  console.log('10. Create test documentation');

  return {
    score,
    issues
  };
};

checkTests();