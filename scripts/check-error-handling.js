const fs = require('fs');
const path = require('path');

const checkErrorHandling = () => {
  console.log('=== ERROR HANDLING CHECK ===\n');

  let score = 100;
  const issues = [];

  // 1. Check Global Error Handler
  console.log('1. Checking Global Error Handler...');
  try {
    const errorHandlerPath = path.join(__dirname, '../src/middleware/errorHandler.js');
    if (fs.existsSync(errorHandlerPath)) {
      const errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf8');

      // Check for essential error handling patterns
      const errorChecks = [
        {
          pattern: /instanceof\s+Error/,
          description: 'Error type checking',
          deduction: 10
        },
        {
          pattern: /process\.env\.NODE_ENV/,
          description: 'Environment-based error responses',
          deduction: 5
        },
        {
          pattern: /stack|stackTrace/,
          description: 'Stack trace handling',
          deduction: 5
        },
        {
          pattern: /status(?:Code)?\s*[:|=]\s*\d{3}/,
          description: 'HTTP status code handling',
          deduction: 10
        }
      ];

      errorChecks.forEach(({ pattern, description, deduction }) => {
        if (!pattern.test(errorHandlerContent)) {
          console.log(`⚠️ Missing ${description}`);
          score -= deduction;
          issues.push(`Missing ${description}`);
        } else {
          console.log(`✅ Found ${description}`);
        }
      });
    } else {
      console.log('❌ Global error handler not found');
      score -= 30;
      issues.push('No global error handler');
    }
  } catch (error) {
    console.log('❌ Error checking error handler:', error.message);
  }

  // 2. Check Custom Error Classes
  console.log('\n2. Checking Custom Error Classes...');
  try {
    const errorsPath = path.join(__dirname, '../src/utils/errors');
    if (fs.existsSync(errorsPath)) {
      const errorFiles = fs.readdirSync(errorsPath).filter(f => f.endsWith('.js'));
      
      if (errorFiles.length === 0) {
        console.log('⚠️ No custom error classes found');
        score -= 10;
        issues.push('No custom error classes');
      } else {
        console.log(`✅ Found ${errorFiles.length} custom error classes`);
        
        // Check each error class
        errorFiles.forEach(file => {
          const content = fs.readFileSync(path.join(errorsPath, file), 'utf8');
          
          // Check for proper error class implementation
          if (!content.includes('extends Error')) {
            console.log(`⚠️ ${file} might not properly extend Error class`);
            score -= 5;
            issues.push(`Improper error class: ${file}`);
          }
        });
      }
    } else {
      console.log('⚠️ No dedicated errors directory found');
      score -= 10;
      issues.push('Missing errors directory');
    }
  } catch (error) {
    console.log('❌ Error checking custom error classes:', error.message);
  }

  // 3. Check Controllers Error Handling
  console.log('\n3. Checking Controllers Error Handling...');
  try {
    const controllersPath = path.join(__dirname, '../src/controllers');
    if (fs.existsSync(controllersPath)) {
      const controllerFiles = fs.readdirSync(controllersPath).filter(f => f.endsWith('.js'));
      
      let asyncHandlerCount = 0;
      let tryCatchCount = 0;
      let totalFunctions = 0;

      controllerFiles.forEach(file => {
        const content = fs.readFileSync(path.join(controllersPath, file), 'utf8');
        
        // Count async functions
        const asyncMatches = content.match(/async\s+\w+\s*\(/g) || [];
        totalFunctions += asyncMatches.length;

        // Count error handling patterns
        asyncHandlerCount += (content.match(/asyncHandler|catchAsync|tryCatch/g) || []).length;
        tryCatchCount += (content.match(/try\s*{/g) || []).length;
      });

      if (totalFunctions > 0) {
        const handledFunctions = asyncHandlerCount + tryCatchCount;
        const coverage = (handledFunctions / totalFunctions) * 100;

        console.log(`Error handling coverage: ${coverage.toFixed(1)}%`);
        if (coverage < 80) {
          console.log('⚠️ Insufficient error handling coverage');
          score -= Math.round((80 - coverage) / 10);
          issues.push('Low error handling coverage');
        } else {
          console.log('✅ Good error handling coverage');
        }
      }
    }
  } catch (error) {
    console.log('❌ Error checking controllers:', error.message);
  }

  // 4. Check Services Error Handling
  console.log('\n4. Checking Services Error Handling...');
  try {
    const servicesPath = path.join(__dirname, '../src/services');
    if (fs.existsSync(servicesPath)) {
      const serviceFiles = fs.readdirSync(servicesPath).filter(f => f.endsWith('.js'));
      
      serviceFiles.forEach(file => {
        const content = fs.readFileSync(path.join(servicesPath, file), 'utf8');
        
        // Check for proper error throwing
        if (!content.includes('throw new')) {
          console.log(`⚠️ ${file} might not properly throw errors`);
          score -= 5;
          issues.push(`No error throwing in ${file}`);
        }

        // Check for custom error usage
        if (!content.match(/\w+Error/)) {
          console.log(`⚠️ ${file} might not use custom error classes`);
          score -= 3;
          issues.push(`No custom errors in ${file}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking services:', error.message);
  }

  // 5. Check Validation Error Handling
  console.log('\n5. Checking Validation Error Handling...');
  try {
    const middlewarePath = path.join(__dirname, '../src/middleware');
    if (fs.existsSync(middlewarePath)) {
      const validationFiles = fs.readdirSync(middlewarePath)
        .filter(f => f.match(/valid|schema|check/i));

      if (validationFiles.length === 0) {
        console.log('⚠️ No dedicated validation files found');
        score -= 5;
        issues.push('Missing validation middleware');
      } else {
        validationFiles.forEach(file => {
          const content = fs.readFileSync(path.join(middlewarePath, file), 'utf8');
          
          // Check for validation error handling
          if (!content.match(/catch.*ValidationError/)) {
            console.log(`⚠️ ${file} might not handle validation errors`);
            score -= 3;
            issues.push(`No validation error handling in ${file}`);
          }
        });
      }
    }
  } catch (error) {
    console.log('❌ Error checking validation:', error.message);
  }

  // Final Score and Recommendations
  console.log('\n=== ERROR HANDLING SCORE ===');
  console.log(`Overall Score: ${score}/100`);

  if (issues.length > 0) {
    console.log('\nIdentified Issues:');
    issues.forEach(issue => console.log(`- ${issue}`));
  }

  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Implement a robust global error handler');
  console.log('2. Create custom error classes for different error types');
  console.log('3. Use async/await with proper error handling');
  console.log('4. Add validation error handling middleware');
  console.log('5. Implement proper error logging');
  console.log('6. Add error monitoring and alerting');
  console.log('7. Use environment-based error responses');
  console.log('8. Implement proper status codes for different errors');
  console.log('9. Add request validation middleware');
  console.log('10. Implement proper error recovery mechanisms');

  return {
    score,
    issues
  };
};

checkErrorHandling();