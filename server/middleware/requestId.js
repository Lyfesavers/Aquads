/**
 * Request ID Middleware
 * Adds a unique request ID to each request for better traceability
 */

const crypto = require('crypto');

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  // Use crypto.randomUUID if available (Node 14.17.0+), otherwise fallback to random bytes
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Node versions
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Middleware to add request ID to each request
 * The request ID is added to:
 * - req.requestId (for use in route handlers)
 * - res.locals.requestId (for use in templates/views)
 * - Response header X-Request-ID (for client-side tracking)
 */
function requestIdMiddleware(req, res, next) {
  // Generate unique request ID
  const requestId = generateRequestId();
  
  // Add to request object
  req.requestId = requestId;
  
  // Add to response locals
  res.locals.requestId = requestId;
  
  // Add to response header
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

module.exports = requestIdMiddleware;

