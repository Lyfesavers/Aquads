/**
 * Security Audit Logger
 * Logs security-related events for compliance and monitoring
 */

const winston = require('winston');
const path = require('path');

// Create audit logger with separate file
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../audit.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log failed login attempt
 */
function logFailedLogin(identifier, ipAddress, reason = 'Invalid credentials', userAgent = null) {
  auditLogger.warn('Failed login attempt', {
    event: 'FAILED_LOGIN',
    identifier: identifier ? identifier.substring(0, 50) : 'unknown', // Truncate to prevent log injection
    ipAddress: ipAddress || 'unknown',
    userAgent: userAgent ? userAgent.substring(0, 200) : null,
    reason: reason,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log successful login
 */
function logSuccessfulLogin(userId, username, ipAddress, isAdmin = false, userAgent = null) {
  auditLogger.info('Successful login', {
    event: 'SUCCESSFUL_LOGIN',
    userId: userId?.toString(),
    username: username ? username.substring(0, 50) : 'unknown',
    ipAddress: ipAddress || 'unknown',
    isAdmin: isAdmin,
    userAgent: userAgent ? userAgent.substring(0, 200) : null,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log multiple failed login attempts (potential brute force)
 */
function logBruteForceAttempt(identifier, ipAddress, attemptCount, userAgent = null) {
  auditLogger.warn('Brute force attempt detected', {
    event: 'BRUTE_FORCE_ATTEMPT',
    identifier: identifier ? identifier.substring(0, 50) : 'unknown',
    ipAddress: ipAddress || 'unknown',
    attemptCount: attemptCount,
    userAgent: userAgent ? userAgent.substring(0, 200) : null,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log admin action
 */
function logAdminAction(adminId, adminUsername, action, target, details = {}) {
  auditLogger.info('Admin action', {
    event: 'ADMIN_ACTION',
    adminId: adminId?.toString(),
    adminUsername: adminUsername ? adminUsername.substring(0, 50) : 'unknown',
    action: action,
    target: target,
    details: details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log suspicious activity
 */
function logSuspiciousActivity(type, userId, username, ipAddress, details = {}) {
  auditLogger.warn('Suspicious activity detected', {
    event: 'SUSPICIOUS_ACTIVITY',
    type: type,
    userId: userId?.toString(),
    username: username ? username.substring(0, 50) : 'unknown',
    ipAddress: ipAddress || 'unknown',
    details: details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log security event
 */
function logSecurityEvent(eventType, severity, details = {}) {
  const logMethod = severity === 'error' ? 'error' : severity === 'warn' ? 'warn' : 'info';
  auditLogger[logMethod]('Security event', {
    event: eventType,
    severity: severity,
    details: details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log token refresh
 */
function logTokenRefresh(userId, username, ipAddress, success = true) {
  if (success) {
    auditLogger.info('Token refreshed', {
      event: 'TOKEN_REFRESH',
      userId: userId?.toString(),
      username: username ? username.substring(0, 50) : 'unknown',
      ipAddress: ipAddress || 'unknown',
      timestamp: new Date().toISOString()
    });
  } else {
    auditLogger.warn('Token refresh failed', {
      event: 'TOKEN_REFRESH_FAILED',
      userId: userId?.toString(),
      username: username ? username.substring(0, 50) : 'unknown',
      ipAddress: ipAddress || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Log password change
 */
function logPasswordChange(userId, username, ipAddress, success = true) {
  auditLogger.info('Password change', {
    event: 'PASSWORD_CHANGE',
    userId: userId?.toString(),
    username: username ? username.substring(0, 50) : 'unknown',
    ipAddress: ipAddress || 'unknown',
    success: success,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  logFailedLogin,
  logSuccessfulLogin,
  logBruteForceAttempt,
  logAdminAction,
  logSuspiciousActivity,
  logSecurityEvent,
  logTokenRefresh,
  logPasswordChange
};

