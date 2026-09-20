import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

export const uploadRouter = Router();

uploadRouter.use(authMiddleware);

uploadRouter.post('/', upload.array('screenshots', 10), UploadController.uploadScreenshots);
uploadRouter.get('/', UploadController.getUploads);
uploadRouter.get('/extractions/:id', UploadController.getExtraction);
uploadRouter.post('/extractions/:id/confirm', UploadController.confirmExtraction);
uploadRouter.post('/extractions/:id/reject', UploadController.rejectExtraction);
