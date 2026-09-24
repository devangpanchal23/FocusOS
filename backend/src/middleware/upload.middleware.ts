import multer from 'multer';
import os from 'os';
import path from 'path';

// Files are staged in the OS temp directory (writable both locally and on
// Vercel's /tmp) before storage.service.ts persists them to their final
// destination (local ./uploads in dev, Vercel Blob in production).
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PNG, JPG, or WEBP images.'));
    }
  },
});
