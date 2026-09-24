import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { DataSourcesController } from '../../controllers/v5/dataSources.controller.js';
import { SyncCenterController } from '../../controllers/v5/syncCenter.controller.js';
import { DataManagementController } from '../../controllers/v5/dataManagement.controller.js';

// --- Data Sources: mounted at /api/v5/data-sources ---
export const dataSourcesRouter = Router();
dataSourcesRouter.use(authMiddleware);
dataSourcesRouter.get('/', DataSourcesController.list);

// --- Sync Center: mounted at /api/v5/sync-center ---
export const syncCenterRouter = Router();
syncCenterRouter.use(authMiddleware);
syncCenterRouter.get('/', SyncCenterController.getOverview);
syncCenterRouter.post('/:dataSourceId/retry', SyncCenterController.retry);

// --- Data Management: mounted at /api/v5/data-management ---
export const dataManagementRouter = Router();
dataManagementRouter.use(authMiddleware);
dataManagementRouter.get('/export', DataManagementController.exportData);
dataManagementRouter.delete('/purge', DataManagementController.purgeData);
