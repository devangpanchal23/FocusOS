import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { SettingsController } from '../controllers/settings.controller.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/', SettingsController.getSettings);
settingsRouter.put('/', SettingsController.updateSettings);
