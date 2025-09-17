require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const checkPerformance = async () => {
  console.log('=== PERFORMANCE CHECK ===\n');

  let score = 100;
  const issues = [];

  // 1. Check Database Indexes
  console.log('1. Checking Database Indexes...');
  try {
    const modelsDir = path.join(__dirname, '../src/models');
    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

    modelFiles.forEach(file => {
      const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
      const model = require(path.join(modelsDir, file));

      if (model.schema) {
        const indexes = model.schema.indexes();
        console.log(`\n${file}:`);
        console.log(`- Indexes found: ${indexes.length}`);

        // Check frequently queried fields for indexes
        const schemaFields = Object.keys(model.schema.paths);
        schemaFields.forEach(field => {
          const fieldConfig = model.schema.paths[field];
          if (fieldConfig.options.required || fieldConfig.options.unique) {
            const hasIndex = indexes.some(idx => idx[0][field]) || fieldConfig.options.unique;
            if (!hasIndex) {
              console.log(`⚠️ Frequently used field '${field}' is not indexed`);
              score -= 2;
              issues.push(`Missing index on ${file}:${field}`);
            }
          }
        });
      }
    });
  } catch (error) {
    console.log('❌ Error checking indexes:', error.message);
  }

  // 2. Check Caching Implementation
  console.log('\n2. Checking Caching Implementation...');
  try {
    const servicesDir = path.join(__dirname, '../src/services');
    let hasCaching = false;

    if (fs.existsSync(servicesDir)) {
      const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
      
      serviceFiles.forEach(file => {
        const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
        
        // Check for caching implementations
        if (content.includes('cache') || content.includes('redis')) {
          hasCaching = true;
          console.log(`✅ Found caching in ${file}`);
        }
      });

      if (!hasCaching) {
        console.log('⚠️ No caching implementation found');
        score -= 10;
        issues.push('Missing caching implementation');
      }
    }
  } catch (error) {
    console.log('❌ Error checking caching:', error.message);
  }

  // 3. Check Query Optimization
  console.log('\n3. Checking Query Optimization...');
  try {
    const controllersDir = path.join(__dirname, '../src/controllers');
    if (fs.existsSync(controllersDir)) {
      const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
      
      controllerFiles.forEach(file => {
        const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
        
        // Check for proper query optimization
        if (content.includes('.find(') || content.includes('.findOne(')) {
          // Check for field selection
          if (!content.includes('.select(')) {
            console.log(`⚠️ No field selection in ${file}`);
            score -= 2;
            issues.push(`Missing field selection in ${file}`);
          }

          // Check for population limits
          if (content.includes('.populate(') && !content.match(/populate\([^)]*select:/)) {
            console.log(`⚠️ Unlimited population in ${file}`);
            score -= 2;
            issues.push(`Unlimited population in ${file}`);
          }
        }
      });
    }
  } catch (error) {
    console.log('❌ Error checking query optimization:', error.message);
  }

  // 4. Check Rate Limiting
  console.log('\n4. Checking Rate Limiting...');
  try {
    const middlewarePath = path.join(__dirname, '../src/middleware');
    let hasRateLimit = false;

    if (fs.existsSync(middlewarePath)) {
      const files = fs.readdirSync(middlewarePath).filter(f => f.endsWith('.js'));
      
      files.forEach(file => {
        const content = fs.readFileSync(path.join(middlewarePath, file), 'utf8');
        if (content.includes('rate-limit') || content.includes('rateLimit')) {
          hasRateLimit = true;
          console.log('✅ Rate limiting implemented');
        }
      });

      if (!hasRateLimit) {
        console.log('⚠️ No rate limiting found');
        score -= 5;
        issues.push('Missing rate limiting');
      }
    }
  } catch (error) {
    console.log('❌ Error checking rate limiting:', error.message);
  }

  // 5. Check Response Compression
  console.log('\n5. Checking Response Compression...');
  try {
    const appPath = path.join(__dirname, '../src/app.js');
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf8');
      
      if (!content.includes('compression')) {
        console.log('⚠️ No response compression middleware');
        score -= 5;
        issues.push('Missing response compression');
      } else {
        console.log('✅ Response compression implemented');
      }
    }
  } catch (error) {
    console.log('❌ Error checking compression:', error.message);
  }

  // 6. Check File Upload Handling
  console.log('\n6. Checking File Upload Handling...');
  try {
    const uploadServicePath = path.join(__dirname, '../src/services/uploadService.js');
    if (fs.existsSync(uploadServicePath)) {
      const content = fs.readFileSync(uploadServicePath, 'utf8');
      
      // Check for file size limits
      if (!content.match(/limit|maxSize|fileSize/i)) {
        console.log('⚠️ No file size limits found');
        score -= 5;
        issues.push('Missing file upload limits');
      } else {
        console.log('✅ File upload limits implemented');
      }

      // Check for image optimization
      if (content.includes('image') && !content.match(/compress|optimize|sharp/i)) {
        console.log('⚠️ No image optimization found');
        score -= 5;
        issues.push('Missing image optimization');
      }
    }
  } catch (error) {
    console.log('❌ Error checking file upload handling:', error.message);
  }

  // 7. Check Pagination Implementation
  console.log('\n7. Checking Pagination Implementation...');
  try {
    const controllersDir = path.join(__dirname, '../src/controllers');
    let hasPagination = false;

    if (fs.existsSync(controllersDir)) {
      const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
      
      files.forEach(file => {
        const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
        if (content.match(/limit|skip|page|perPage/)) {
          hasPagination = true;
          console.log(`✅ Found pagination in ${file}`);
        }
      });

      if (!hasPagination) {
        console.log('⚠️ No pagination implementation found');
        score -= 5;
        issues.push('Missing pagination');
      }
    }
  } catch (error) {
    console.log('❌ Error checking pagination:', error.message);
  }

  // Final Score and Recommendations
  console.log('\n=== PERFORMANCE SCORE ===');
  console.log(`Overall Score: ${score}/100`);

  if (issues.length > 0) {
    console.log('\nIdentified Issues:');
    issues.forEach(issue => console.log(`- ${issue}`));
  }

  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Implement caching for frequently accessed data');
  console.log('2. Add indexes for frequently queried fields');
  console.log('3. Optimize database queries with field selection');
  console.log('4. Implement response compression');
  console.log('5. Add rate limiting for all endpoints');
  console.log('6. Implement proper pagination');
  console.log('7. Add image optimization for uploads');
  console.log('8. Use connection pooling for database');
  console.log('9. Implement proper error handling');
  console.log('10. Add monitoring and performance metrics');

  return {
    score,
    issues
  };
};

checkPerformance();