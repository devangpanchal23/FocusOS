import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { NotificationController } from '../controllers/notification.controller.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', NotificationController.getNotifications);
notificationRouter.put('/:id/read', NotificationController.markAsRead);
notificationRouter.put('/read-all', NotificationController.markAllAsRead);
notificationRouter.delete('/:id', NotificationController.deleteNotification);
