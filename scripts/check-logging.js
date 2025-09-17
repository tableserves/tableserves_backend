require('dotenv').config();
const fs = require('fs');
const path = require('path');

const checkLogging = () => {
  console.log('=== LOGGING SYSTEM CHECK ===\n');

  let score = 100;
  const issues = [];

  // 1. Check Logger Configuration
  console.log('1. Checking Logger Configuration...');
  try {
    const loggerPath = path.join(__dirname, '../src/utils/logger.js');
    if (fs.existsSync(loggerPath)) {
      const loggerContent = fs.readFileSync(loggerPath, 'utf8');

      // Check for essential logging features
      const loggingChecks = [
        {
          pattern: /winston|bunyan|pino/,
          description: 'Logging library',
          deduction: 20
        },
        {
          pattern: /error|warn|info|debug/,
          description: 'Log levels',
          deduction: 10
        },
        {
          pattern: /timestamp|time|date/i,
          description: 'Timestamp',
          deduction: 5
        },
        {
          pattern: /format|formatter/,
          description: 'Log formatting',
          deduction: 5
        },
        {
          pattern: /transport|destination/,
          description: 'Log transport',
          deduction: 10
        }
      ];

      loggingChecks.forEach(({ pattern, description, deduction }) => {
        if (!pattern.test(loggerContent)) {
          console.log(`⚠️ Missing ${description}`);
          score -= deduction;
          issues.push(`Missing ${description}`);
        } else {
          console.log(`✅ Found ${description}`);
        }
      });

      // Check for environment-based configuration
      if (!loggerContent.includes('process.env')) {
        console.log('⚠️ No environment-based logging configuration');
        score -= 5;
        issues.push('No environment-based logging');
      } else {
        console.log('✅ Environment-based logging configuration found');
      }
    } else {
      console.log('❌ Logger configuration not found');
      score -= 50;
      issues.push('No logger configuration');
    }
  } catch (error) {
    console.log('❌ Error checking logger:', error.message);
  }

  // 2. Check Log File Configuration
  console.log('\n2. Checking Log File Configuration...');
  const logFile = process.env.LOG_FILE || 'app.log';
  const logDir = path.dirname(path.join(__dirname, '..', logFile));

  try {
    if (fs.existsSync(logDir)) {
      console.log('✅ Log directory exists');
      
      // Check write permissions
      try {
        const testFile = path.join(logDir, '.test-write');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('✅ Log directory is writable');
      } catch (error) {
        console.log('⚠️ Log directory is not writable');
        score -= 10;
        issues.push('Log directory not writable');
      }
    } else {
      console.log('⚠️ Log directory does not exist');
      score -= 10;
      issues.push('Missing log directory');
    }
  } catch (error) {
    console.log('❌ Error checking log directory:', error.message);
  }

  // 3. Check Logging Usage in Controllers
  console.log('\n3. Checking Logging Usage in Controllers...');
  try {
    const controllersPath = path.join(__dirname, '../src/controllers');
    if (fs.existsSync(controllersPath)) {
      const controllerFiles = fs.readdirSync(controllersPath).filter(f => f.endsWith('.js'));
      
      let totalControllers = controllerFiles.length;
      let controllersWithLogging = 0;

      controllerFiles.forEach(file => {
        const content = fs.readFileSync(path.join(controllersPath, file), 'utf8');
        
        // Check for logging statements
        if (content.match(/log\.|logger\.|console\./)) {
          controllersWithLogging++;
        } else {
          console.log(`⚠️ No logging found in ${file}`);
        }
      });

      const loggingCoverage = (controllersWithLogging / totalControllers) * 100;
      console.log(`Logging coverage in controllers: ${loggingCoverage.toFixed(1)}%`);

      if (loggingCoverage < 80) {
        score -= Math.round((80 - loggingCoverage) / 10);
        issues.push('Low logging coverage in controllers');
      }
    }
  } catch (error) {
    console.log('❌ Error checking controllers:', error.message);
  }

  // 4. Check Error Logging
  console.log('\n4. Checking Error Logging...');
  try {
    const errorHandlerPath = path.join(__dirname, '../src/middleware/errorHandler.js');
    if (fs.existsSync(errorHandlerPath)) {
      const content = fs.readFileSync(errorHandlerPath, 'utf8');
      
      // Check for error logging
      if (!content.match(/log\.|logger\.|console\./)) {
        console.log('⚠️ No error logging in error handler');
        score -= 10;
        issues.push('Missing error logging');
      } else {
        console.log('✅ Error logging implemented');
      }
    }
  } catch (error) {
    console.log('❌ Error checking error handler:', error.message);
  }

  // 5. Check Request Logging
  console.log('\n5. Checking Request Logging...');
  try {
    const appPath = path.join(__dirname, '../src/app.js');
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf8');
      
      // Check for request logging middleware
      if (!content.match(/morgan|winston.*logger|pino-http/)) {
        console.log('⚠️ No request logging middleware found');
        score -= 10;
        issues.push('Missing request logging');
      } else {
        console.log('✅ Request logging middleware found');
      }
    }
  } catch (error) {
    console.log('❌ Error checking app.js:', error.message);
  }

  // Final Score and Recommendations
  console.log('\n=== LOGGING SYSTEM SCORE ===');
  console.log(`Overall Score: ${score}/100`);

  if (issues.length > 0) {
    console.log('\nIdentified Issues:');
    issues.forEach(issue => console.log(`- ${issue}`));
  }

  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Implement structured logging');
  console.log('2. Add request ID tracking');
  console.log('3. Configure log rotation');
  console.log('4. Implement different log levels for different environments');
  console.log('5. Add performance logging');
  console.log('6. Implement audit logging for sensitive operations');
  console.log('7. Add error stack traces in development');
  console.log('8. Configure log aggregation');
  console.log('9. Implement request/response logging');
  console.log('10. Add logging for background tasks');

  return {
    score,
    issues
  };
};

checkLogging();