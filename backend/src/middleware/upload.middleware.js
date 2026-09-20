import multer from 'multer';
import path from 'path';
import fs from 'fs';
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
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
        }
        else {
            cb(new Error('Unsupported file type. Please upload PNG, JPG, or WEBP images.'));
        }
    },
});
