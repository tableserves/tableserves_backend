const dataPersistenceService = require('../services/DataPersistenceService');
const { logger } = require('../utils/logger');
const mongoose = require('mongoose');

// Test schema for validation
const TestSchema = new mongoose.Schema({
  testId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  data: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('Test', TestSchema);

class TestController {
  /**
   * Comprehensive database connection and operations test
   */
  async testDatabaseOperations(req, res) {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    try {
      logger.info('Starting comprehensive database test', { testId });
      
      const results = {
        testId,
        timestamp: new Date().toISOString(),
        tests: {},
        summary: {
          passed: 0,
          failed: 0,
          total: 0
        }
      };

      // Test 1: Basic connection test
      try {
        await mongoose.connection.db.admin().ping();
        results.tests.connectionTest = { 
          status: 'PASSED', 
          message: 'Database connection is healthy',
          timestamp: new Date().toISOString()
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.connectionTest = { 
          status: 'FAILED', 
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
      }
      results.summary.total++;

      // Test 2: Create operation
      const testData = {
        testId,
        name: 'Test User',
        email: 'test@example.com',
        data: {
          location: 'Test Location',
          preferences: { theme: 'dark', language: 'en' }
        }
      };

      try {
        const created = await dataPersistenceService.saveData(TestModel, testData);
        results.tests.createTest = { 
          status: 'PASSED', 
          message: 'Document created successfully',
          documentId: created._id,
          timestamp: new Date().toISOString()
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.createTest = { 
          status: 'FAILED', 
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
      }
      results.summary.total++;

      // Test 3: Read operation
      try {
        const found = await TestModel.findOne({ testId }).lean();
        if (found) {
          results.tests.readTest = { 
            status: 'PASSED', 
            message: 'Document found successfully',
            documentId: found._id,
            timestamp: new Date().toISOString()
          };
          results.summary.passed++;
        } else {
          throw new Error('Document not found');
        }
      } catch (error) {
        results.tests.readTest = { 
          status: 'FAILED', 
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
      }
      results.summary.total++;

      // Test 4: Update operation
      try {
        const updated = await dataPersistenceService.updateData(
          TestModel,
          { testId },
          { 
            name: 'Updated Test User',
            updatedAt: new Date(),
            data: {
              location: 'Updated Location',
              preferences: { theme: 'light', language: 'es' },
              lastUpdate: new Date().toISOString()
            }
          }
        );
        
        if (updated) {
          results.tests.updateTest = { 
            status: 'PASSED', 
            message: 'Document updated successfully',
            documentId: updated._id,
            timestamp: new Date().toISOString()
          };
          results.summary.passed++;
        } else {
          throw new Error('Update failed - document not found');
        }
      } catch (error) {
        results.tests.updateTest = { 
          status: 'FAILED', 
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
      }
      results.summary.total++;

      // Test 5: Transaction test
      try {
        const operations = [
          {
            type: 'create',
            model: TestModel,
            data: {
              testId: `${testId}_batch_1`,
              name: 'Batch User 1',
              email: 'batch1@example.com'
            }
          },
          {
            type: 'create',
            model: TestModel,
            data: {
              testId: `${testId}_batch_2`,
              name: 'Batch User 2',
              email: 'batch2@example.com'
            }
          }
        ];

        const batchResults = await dataPersistenceService.bulkOperations(operations);
        
        if (batchResults && batchResults.length === 2) {
          results.tests.transactionTest = { 
            status: 'PASSED', 
            message: 'Bulk operations completed successfully',
            documentsCreated: batchResults.length,
            timestamp: new Date().toISOString()
          };
          results.summary.passed++;
        } else {
          throw new Error('Bulk operations failed');
        }
      } catch (error) {
        results.tests.transactionTest = { 
          status: 'FAILED', 
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
      }
      results.summary.total++;

      // Test 6: Index performance test
      try {
        const start = Date.now();
        await TestModel.findOne({ testId }).explain('executionStats');
        const duration = Date.now() - start;
        
        results.tests.indexTest = { 
          status: 'PASSED', 
          message: 'Index query executed successfully',
          executionTime: duration,
          timestamp: new Date().toISOString()
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.indexTest = { 
          status: 'FAILED', 
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.failed++;
      }
      results.summary.total++;

      // Cleanup: Delete test documents
      try {
        await TestModel.deleteMany({ 
          testId: { $regex: `^${testId}` } 
        });
        
        results.cleanup = {
          status: 'COMPLETED',
          message: 'Test documents cleaned up successfully',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results.cleanup = {
          status: 'FAILED',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Calculate success rate
      results.summary.successRate = (results.summary.passed / results.summary.total * 100).toFixed(2);
      results.summary.status = results.summary.failed === 0 ? 'ALL_PASSED' : 'SOME_FAILED';

      logger.info('Database test completed', {
        testId,
        summary: results.summary
      });

      res.json({
        success: true,
        message: 'Database operations test completed',
        data: results
      });

    } catch (error) {
      logger.error('Database test failed', {
        testId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          testId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get database health metrics
   */
  async getHealthMetrics(req, res) {
    try {
      const metrics = await dataPersistenceService.getHealthMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get health metrics', error);
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test specific data persistence features
   */
  async testDataPersistence(req, res) {
    const { operation, model, data } = req.body;
    
    try {
      let result;
      
      switch (operation) {
        case 'create':
          result = await dataPersistenceService.saveData(TestModel, data);
          break;
          
        case 'update':
          result = await dataPersistenceService.updateData(
            TestModel, 
            { _id: data.id }, 
            data.updates
          );
          break;
          
        case 'delete':
          result = await dataPersistenceService.deleteData(
            TestModel, 
            { _id: data.id }
          );
          break;
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      res.json({
        success: true,
        operation,
        data: result
      });
      
    } catch (error) {
      logger.error('Data persistence test failed', {
        operation,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: error.message,
        operation
      });
    }
  }
}

module.exports = new TestController();