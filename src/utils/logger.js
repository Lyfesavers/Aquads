/**
 * Custom logger utility that conditionally logs based on environment
 * This prevents console logs from appearing in production while maintaining them in development
 * 
 * USAGE:
 * 1. Import this logger in your file:
 *    import logger from '../utils/logger';
 * 
 * 2. Replace console.log with logger.log:
 *    logger.log('Message', data);  // Only appears in development
 * 
 * 3. Use appropriate logging levels:
 *    logger.info('Info message');  // For general information (dev only)
 *    logger.warn('Warning');       // For potential issues (dev only)
 *    logger.error('Error');        // For errors (dev only)
 *    logger.critical('Critical');  // For critical errors (always logged)
 * 
 * SECURITY NOTE:
 * Never use direct console.log/error/warn in code as it may expose sensitive information
 * in production environments. Always use this logger instead.
 */

// Determine if we're in production
const isProduction = 
  process.env.NODE_ENV === 'production' || 
  process.env.REACT_APP_ENV === 'production' ||
  window.location.hostname === 'aquads.xyz' || 
  window.location.hostname === 'www.aquads.xyz';

// Create a logger object that conditionally logs based on environment
const logger = {
  log: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args) => {
    // Only log regular errors in development to prevent sensitive info leakage
    if (!isProduction) {
      console.error(...args);
    }
  },
  
  warn: (...args) => {
    // Only log warnings in development
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  
  // For critical errors that should always be logged even in production
  critical: (...args) => {
    console.error('[CRITICAL]', ...args);
    // In a real app, you would send this to a logging service
    // logErrorToService(args);
  }
};

export default logger; 