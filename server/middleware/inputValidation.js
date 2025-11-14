/**
 * Input Validation Middleware
 * Validates and sanitizes user inputs for security
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation result handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Username validation rules
 */
const validateUsername = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores and hyphens')
    .escape(),
  handleValidationErrors
];

/**
 * Email validation rules
 */
const validateEmail = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),
  handleValidationErrors
];

/**
 * Password validation rules
 */
const validatePassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  handleValidationErrors
];

/**
 * Login validation rules
 */
const validateLogin = [
  body('identifier')
    .optional()
    .trim()
    .notEmpty().withMessage('Identifier cannot be empty')
    .isLength({ max: 255 }).withMessage('Identifier is too long'),
  body('username')
    .optional()
    .trim()
    .notEmpty().withMessage('Username cannot be empty')
    .isLength({ max: 255 }).withMessage('Username is too long'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 500 }).withMessage('Password length is invalid'),
  handleValidationErrors
];

/**
 * Registration validation rules
 */
const validateRegistration = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores and hyphens'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  handleValidationErrors
];

/**
 * Search query validation
 */
const validateSearchQuery = [
  query('query')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Username parameter validation
 */
const validateUsernameParam = [
  param('username')
    .trim()
    .notEmpty().withMessage('Username parameter is required')
    .isLength({ min: 1, max: 50 }).withMessage('Username parameter is invalid')
    .escape(),
  handleValidationErrors
];

/**
 * ID parameter validation (MongoDB ObjectId)
 */
const validateIdParam = [
  param('id')
    .notEmpty().withMessage('ID parameter is required')
    .matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Generic string field validation
 */
const validateStringField = (fieldName, options = {}) => {
  const { min = 1, max = 1000, required = true } = options;
  const validators = [
    body(fieldName)
      .optional(!required)
      .trim()
      .custom((value) => {
        if (required && !value) {
          throw new Error(`${fieldName} is required`);
        }
        if (value && value.length < min) {
          throw new Error(`${fieldName} must be at least ${min} characters`);
        }
        if (value && value.length > max) {
          throw new Error(`${fieldName} must be less than ${max} characters`);
        }
        return true;
      })
      .escape()
  ];
  validators.push(handleValidationErrors);
  return validators;
};

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validateLogin,
  validateRegistration,
  validateSearchQuery,
  validateUsernameParam,
  validateIdParam,
  validateStringField,
  handleValidationErrors
};

