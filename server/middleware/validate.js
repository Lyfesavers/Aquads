const { body, validationResult } = require('express-validator');

const validateBumpRequest = [
  body('adId').trim().notEmpty(),
  body('owner').trim().notEmpty(),
  body('txSignature').trim().notEmpty(),
  body('duration').isInt({ min: 0 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]; 