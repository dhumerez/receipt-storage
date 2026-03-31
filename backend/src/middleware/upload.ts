import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (FR-06.10)
    files: 5,                    // max 5 files per request (FR-06.10)
  },
  fileFilter(_req, file, cb) {
    // Block SVG at MIME level (FR-06.12)
    if (file.mimetype === 'image/svg+xml' || file.originalname.toLowerCase().endsWith('.svg')) {
      cb(null, false);
      return;
    }
    cb(null, true);
  },
}).array('files', 5);
