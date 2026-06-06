const mongoose = require('mongoose');
const User = require('../models/User');
const Plan = require('../models/Plan');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Cron job script to check and handle plan expiry
 * This should be run daily via cron job or task scheduler
 */
async function checkPlanExpiry() {
  try {
    console.log('Starting plan expiry check...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URI);
    console.log('Connected to MongoDB');

    // Find all users with active plans that have expired
    const expiredUsers = await User.find({
      planStatus: 'active',
      planExpiryDate: { $lt: new Date() },
      currentPlanId: { $ne: null }
    }).populate('currentPlanId');

    console.log(`Found ${expiredUsers.length} users with expired plans`);

    let processedCount = 0;
    let errorCount = 0;

    for (const user of expiredUsers) {
      try {
        console.log(`Processing expired plan for user: ${user._id} (${user.email})`);
        
        // Get the free plan for the user's business type
        const freePlan = await Plan.findOne({
          key: 'free',
          planType: user.businessType || 'restaurant',
          active: true
        });

        if (!freePlan) {
          console.error(`No free plan found for business type: ${user.businessType}`);
          errorCount++;
          continue;
        }

        // Update user's plan history
        const planHistoryEntry = {
          planId: user.currentPlanId._id,
          startDate: user.planStartDate || new Date(),
          endDate: new Date(),
          status: 'expired',
          reason: 'Plan expired'
        };

        // Expire the plan and downgrade to free
        await User.findByIdAndUpdate(user._id, {
          $set: {
            currentPlanId: freePlan._id,
            planStatus: 'active',
            planExpiryDate: null, // Free plan doesn't expire
            planStartDate: new Date()
          },
          $push: {
            planHistory: planHistoryEntry
          }
        });

        console.log(`Successfully downgraded user ${user._id} to free plan`);
        processedCount++;

        // Log the expiry for audit purposes
        logger.info('Plan expired and downgraded', {
          userId: user._id,
          userEmail: user.email,
          expiredPlan: user.currentPlanId.name,
          expiredPlanId: user.currentPlanId._id,
          expiryDate: user.planExpiryDate,
          downgradedTo: freePlan.name,
          processedAt: new Date()
        });

      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
        logger.error('Error processing plan expiry', {
          userId: user._id,
          error: error.message,
          stack: error.stack
        });
        errorCount++;
      }
    }

    // Check for plans expiring soon (within 3 days) for notifications
    const soonToExpireUsers = await User.find({
      planStatus: 'active',
      planExpiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      },
      currentPlanId: { $ne: null }
    }).populate('currentPlanId');

    console.log(`Found ${soonToExpireUsers.length} users with plans expiring soon`);

    // Log users with plans expiring soon for notification purposes
    for (const user of soonToExpireUsers) {
      const daysRemaining = Math.ceil((user.planExpiryDate - new Date()) / (24 * 60 * 60 * 1000));
      
      logger.info('Plan expiring soon', {
        userId: user._id,
        userEmail: user.email,
        planName: user.currentPlanId.name,
        expiryDate: user.planExpiryDate,
        daysRemaining: daysRemaining
      });

      // Here you could integrate with email service to send expiry warnings
      console.log(`User ${user.email} plan expires in ${daysRemaining} day(s)`);
    }

    console.log('\n=== PLAN EXPIRY CHECK SUMMARY ===');
    console.log(`Total expired plans processed: ${processedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log(`Plans expiring soon: ${soonToExpireUsers.length}`);
    console.log('Plan expiry check completed successfully!');

    return {
      processedCount,
      errorCount,
      soonToExpireCount: soonToExpireUsers.length
    };

  } catch (error) {
    console.error('Error in plan expiry check:', error);
    logger.error('Plan expiry check failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Clean up old payment records (older than 30 days)
 */
async function cleanupOldPayments() {
  try {
    console.log('Starting payment cleanup...');
    
    const PlanPayment = require('../models/PlanPayment');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete old failed/pending payments
    const deleteResult = await PlanPayment.deleteMany({
      status: { $in: ['pending', 'failed'] },
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleaned up ${deleteResult.deletedCount} old payment records`);
    
    logger.info('Payment cleanup completed', {
      deletedCount: deleteResult.deletedCount,
      cleanupDate: thirtyDaysAgo
    });

    return deleteResult.deletedCount;

  } catch (error) {
    console.error('Error in payment cleanup:', error);
    logger.error('Payment cleanup failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Main function to run all maintenance tasks
 */
async function runMaintenanceTasks() {
  try {
    console.log('=== STARTING PLAN MAINTENANCE TASKS ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URI);
    
    // Run plan expiry check
    const expiryResults = await checkPlanExpiry();
    
    // Run payment cleanup
    const cleanupCount = await cleanupOldPayments();
    
    console.log('\n=== MAINTENANCE TASKS COMPLETED ===');
    console.log(`Expired plans processed: ${expiryResults.processedCount}`);
    console.log(`Plans expiring soon: ${expiryResults.soonToExpireCount}`);
    console.log(`Old payments cleaned: ${cleanupCount}`);
    console.log(`Errors: ${expiryResults.errorCount}`);
    
    return {
      success: true,
      expiryResults,
      cleanupCount
    };

  } catch (error) {
    console.error('Maintenance tasks failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await mongoose.disconnect();
  }
}

// Run the maintenance tasks if this file is executed directly
if (require.main === module) {
  runMaintenanceTasks()
    .then(result => {
      console.log('Maintenance completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Maintenance failed:', error);
      process.exit(1);
    });
}

module.exports = {
  checkPlanExpiry,
  cleanupOldPayments,
  runMaintenanceTasks
};
