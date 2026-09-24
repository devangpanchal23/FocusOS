import { Router } from 'express';
import { CronController } from '../controllers/v5/cron.controller.js';

export const cronRouter = Router();

cronRouter.get('/retry-ingestion', CronController.retryIngestion);
