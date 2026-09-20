import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ExportController } from '../controllers/export.controller.js';
export const exportRouter = Router();
exportRouter.use(requireAuth);
exportRouter.get('/csv', ExportController.exportCSV);
exportRouter.get('/json', ExportController.exportJSON);
exportRouter.get('/digest', ExportController.exportDigest);
