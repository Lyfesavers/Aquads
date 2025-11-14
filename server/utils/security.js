/**
 * Security utility functions for input sanitization and validation
 */

/**
 * Escapes special regex characters to prevent NoSQL injection
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for use in regex
 */
function escapeRegex(str) {
  if (typeof str !== 'string') {
    return '';
  }
  // Escape special regex characters: . * + ? ^ $ { } ( ) | [ ] \
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes a string for use in MongoDB regex queries
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized string safe for regex queries
 */
function sanitizeForRegex(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  // Trim whitespace and escape special characters
  return escapeRegex(input.trim());
}

/**
 * Validates and sanitizes search query input
 * @param {string} query - Search query from user
 * @param {number} minLength - Minimum length (default: 2)
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
function validateSearchQuery(query, minLength = 2, maxLength = 100) {
  if (!query || typeof query !== 'string') {
    return { valid: false, sanitized: '', error: 'Query is required' };
  }

  const trimmed = query.trim();
  
  if (trimmed.length < minLength) {
    return { valid: false, sanitized: '', error: `Query must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, sanitized: '', error: `Query must be less than ${maxLength} characters` };
  }

  return { valid: true, sanitized: sanitizeForRegex(trimmed), error: null };
}

module.exports = {
  escapeRegex,
  sanitizeForRegex,
  validateSearchQuery
};

