const { body, validationResult } = require('express-validator');

const validateBumpRequest = [
  body('adId').trim().notEmpty(),
  body('owner').trim().notEmpty(),
  body('txSignature').trim().notEmpty(),
  body('duration').custom((value) => {
    const duration = parseInt(value);
    if (isNaN(duration) || (duration < 0 && duration !== -1)) {
      throw new Error('Duration must be a positive number or -1 for lifetime');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]; 