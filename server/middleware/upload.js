const multer = require('multer');
const path = require('path');
const fs = require('fs');
const spaces = require('../utils/spaces');

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

const saveToDiskFallback = (file) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return `/uploads/${filename}`;
};

const uploadMiddleware = (fieldName) => (req, res, next) => {
  memoryUpload.single(fieldName)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file?.buffer) {
      return next();
    }

    try {
      if (spaces.isConfigured()) {
        const key = spaces.buildKey('uploads', req.file.originalname);
        req.file.location = await spaces.uploadBuffer(req.file.buffer, {
          key,
          contentType: req.file.mimetype
        });
      } else {
        req.file.location = saveToDiskFallback(req.file);
      }
    } catch (uploadErr) {
      console.error('[Upload] failed:', uploadErr.message);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    next();
  });
};

module.exports = {
  single: (fieldName) => uploadMiddleware(fieldName)
};
