const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

class DataPersistenceService {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.transactionTimeout = 30000; // 30 seconds
  }

  /**
   * Save data with retry logic and error handling
   */
  async saveData(model, data, options = {}) {
    const { 
      retries = this.retryAttempts, 
      useTransaction = false,
      validate = true 
    } = options;

    let attempt = 0;
    
    while (attempt < retries) {
      try {
        if (useTransaction) {
          return await this.saveWithTransaction(model, data, options);
        } else {
          return await this.saveDirectly(model, data, validate);
        }
      } catch (error) {
        attempt++;
        
        if (attempt >= retries) {
          logger.error('Failed to save data after all retries', {
            model: model.modelName,
            attempts: attempt,
            error: error.message,
            data: JSON.stringify(data, null, 2)
          });
          throw this.enhanceError(error, 'SAVE_FAILED', { model: model.modelName, attempts: attempt });
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          logger.error('Non-retryable error encountered', {
            model: model.modelName,
            error: error.message,
            code: error.code
          });
          throw this.enhanceError(error, 'NON_RETRYABLE_ERROR', { model: model.modelName });
        }
        
        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.warn(`Retrying save operation`, {
          model: model.modelName,
          attempt,
          maxRetries: retries,
          delay,
          error: error.message
        });
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * Save data directly without transaction
   */
  async saveDirectly(model, data, validate = true) {
    try {
      const document = new model(data);
      
      if (validate) {
        await document.validate();
      }
      
      const result = await document.save();
      
      logger.info('Document saved successfully', {
        model: model.modelName,
        id: result._id,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      logger.error('Direct save failed', {
        model: model.modelName,
        error: error.message,
        validationErrors: error.errors ? Object.keys(error.errors) : null
      });
      throw error;
    }
  }

  /**
   * Save data with transaction support
   */
  async saveWithTransaction(model, data, options = {}) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction({
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        maxTimeMS: this.transactionTimeout
      });

      const document = new model(data);
      await document.validate();
      
      const result = await document.save({ session });
      
      // Execute any additional operations if provided
      if (options.additionalOperations) {
        await options.additionalOperations(session, result);
      }
      
      await session.commitTransaction();
      
      logger.info('Document saved with transaction', {
        model: model.modelName,
        id: result._id,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      await session.abortTransaction();
      
      logger.error('Transaction save failed', {
        model: model.modelName,
        error: error.message,
        errorName: error.name
      });
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update data with retry logic
   */
  async updateData(model, filter, update, options = {}) {
    const { 
      retries = this.retryAttempts,
      useTransaction = false,
      upsert = false
    } = options;

    let attempt = 0;
    
    while (attempt < retries) {
      try {
        if (useTransaction) {
          return await this.updateWithTransaction(model, filter, update, options);
        } else {
          const result = await model.findOneAndUpdate(
            filter, 
            update, 
            { 
              new: true, 
              runValidators: true,
              upsert,
              ...options 
            }
          );
          
          if (!result && !upsert) {
            throw new Error('Document not found for update');
          }
          
          logger.info('Document updated successfully', {
            model: model.modelName,
            id: result?._id,
            filter: JSON.stringify(filter),
            timestamp: new Date().toISOString()
          });
          
          return result;
        }
      } catch (error) {
        attempt++;
        
        if (attempt >= retries) {
          logger.error('Failed to update data after all retries', {
            model: model.modelName,
            attempts: attempt,
            error: error.message,
            filter: JSON.stringify(filter)
          });
          throw this.enhanceError(error, 'UPDATE_FAILED', { model: model.modelName, attempts: attempt });
        }
        
        if (!this.isRetryableError(error)) {
          throw this.enhanceError(error, 'NON_RETRYABLE_UPDATE_ERROR', { model: model.modelName });
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.warn(`Retrying update operation`, {
          model: model.modelName,
          attempt,
          maxRetries: retries,
          delay,
          error: error.message
        });
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * Update data with transaction support
   */
  async updateWithTransaction(model, filter, update, options = {}) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction({
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' }
      });

      const result = await model.findOneAndUpdate(
        filter,
        update,
        { 
          new: true, 
          runValidators: true,
          session,
          ...options 
        }
      );
      
      if (!result && !options.upsert) {
        throw new Error('Document not found for update');
      }
      
      await session.commitTransaction();
      
      logger.info('Document updated with transaction', {
        model: model.modelName,
        id: result?._id,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      await session.abortTransaction();
      
      logger.error('Transaction update failed', {
        model: model.modelName,
        error: error.message,
        filter: JSON.stringify(filter)
      });
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete data with safety checks
   */
  async deleteData(model, filter, options = {}) {
    const { 
      retries = this.retryAttempts,
      useTransaction = false,
      softDelete = false
    } = options;

    let attempt = 0;
    
    while (attempt < retries) {
      try {
        if (softDelete) {
          return await this.updateData(model, filter, { 
            deletedAt: new Date(),
            isDeleted: true 
          }, options);
        }
        
        if (useTransaction) {
          return await this.deleteWithTransaction(model, filter, options);
        } else {
          const result = await model.findOneAndDelete(filter);
          
          if (!result) {
            throw new Error('Document not found for deletion');
          }
          
          logger.info('Document deleted successfully', {
            model: model.modelName,
            id: result._id,
            timestamp: new Date().toISOString()
          });
          
          return result;
        }
      } catch (error) {
        attempt++;
        
        if (attempt >= retries) {
          logger.error('Failed to delete data after all retries', {
            model: model.modelName,
            attempts: attempt,
            error: error.message,
            filter: JSON.stringify(filter)
          });
          throw this.enhanceError(error, 'DELETE_FAILED', { model: model.modelName, attempts: attempt });
        }
        
        if (!this.isRetryableError(error)) {
          throw this.enhanceError(error, 'NON_RETRYABLE_DELETE_ERROR', { model: model.modelName });
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Bulk operations with transaction support
   */
  async bulkOperations(operations, options = {}) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction({
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' }
      });

      const results = [];
      
      for (const operation of operations) {
        const { type, model, data, filter, update } = operation;
        
        let result;
        
        switch (type) {
          case 'create':
            const document = new model(data);
            result = await document.save({ session });
            break;
            
          case 'update':
            result = await model.findOneAndUpdate(
              filter,
              update,
              { new: true, runValidators: true, session }
            );
            break;
            
          case 'delete':
            result = await model.findOneAndDelete(filter, { session });
            break;
            
          default:
            throw new Error(`Unknown operation type: ${type}`);
        }
        
        results.push(result);
      }
      
      await session.commitTransaction();
      
      logger.info('Bulk operations completed successfully', {
        operationsCount: operations.length,
        timestamp: new Date().toISOString()
      });
      
      return results;
    } catch (error) {
      await session.abortTransaction();
      
      logger.error('Bulk operations failed', {
        error: error.message,
        operationsCount: operations.length
      });
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [
      11000, // Duplicate key error (sometimes temporary)
      16500, // Connection error
      89,    // Network timeout
      7,     // HostNotFound
      6,     // HostUnreachable
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];

    const retryableMessages = [
      'connection',
      'timeout',
      'network',
      'socket',
      'ECONNRESET',
      'ECONNREFUSED'
    ];

    // Check error codes
    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // Check error messages
    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(originalError, errorType, context = {}) {
    const enhancedError = new Error(originalError.message);
    enhancedError.name = errorType;
    enhancedError.originalError = originalError;
    enhancedError.context = context;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.stack = originalError.stack;
    
    return enhancedError;
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get database health metrics
   */
  async getHealthMetrics() {
    try {
      const stats = await mongoose.connection.db.stats();
      const adminStats = await mongoose.connection.db.admin().serverStatus();
      
      return {
        database: {
          name: mongoose.connection.db.databaseName,
          collections: stats.collections,
          objects: stats.objects,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize
        },
        connection: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        },
        server: {
          version: adminStats.version,
          uptime: adminStats.uptime,
          connections: adminStats.connections
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get health metrics', error.message);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new DataPersistenceService();
