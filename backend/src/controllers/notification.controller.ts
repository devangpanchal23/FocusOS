import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  static async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await NotificationService.getNotifications(req.user!.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await NotificationService.markAsRead(req.user!.id, req.params.id);
      res.json({ message: 'Notification marked as read' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      await NotificationService.deleteNotification(req.user!.id, req.params.id);
      res.json({ message: 'Notification deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
