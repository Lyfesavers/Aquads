const TwitterRaid = require('../models/TwitterRaid');
const cron = require('node-cron');
const logger = require('../utils/logger') || console;

/**
 * Cleanup service for automatically removing old data
 */
class CleanupService {
  /**
   * Initialize the cleanup service with scheduled tasks
   */
  static init() {
    // Schedule cleanup of old Twitter raids to run daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        await CleanupService.cleanupOldTwitterRaids();
        logger.info('Scheduled Twitter raid cleanup completed successfully');
      } catch (error) {
        logger.error('Error in scheduled Twitter raid cleanup:', error);
      }
    });

    logger.info('Cleanup service initialized with scheduled tasks');
  }

  /**
   * Clean up Twitter raids older than 7 days by marking them as inactive
   * @returns {Promise<number>} Number of raids cleaned up
   */
  static async cleanupOldTwitterRaids() {
    try {
      // Calculate the date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find all active raids older than 7 days
      const result = await TwitterRaid.updateMany(
        { 
          createdAt: { $lt: sevenDaysAgo },
          active: true
        },
        { 
          active: false
        }
      );

      logger.info(`Cleaned up ${result.modifiedCount} Twitter raids older than 7 days`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error cleaning up old Twitter raids:', error);
      throw error;
    }
  }

  /**
   * Immediately clean up old Twitter raids (can be called via API or manually)
   * @returns {Promise<object>} Cleanup result
   */
  static async runManualCleanup() {
    try {
      const raidCount = await this.cleanupOldTwitterRaids();
      
      return {
        success: true,
        cleanedUpRaids: raidCount,
        message: `Successfully cleaned up ${raidCount} old Twitter raids`
      };
    } catch (error) {
      logger.error('Error in manual cleanup:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clean up old Twitter raids'
      };
    }
  }
}

module.exports = CleanupService; 