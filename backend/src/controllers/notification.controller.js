import { NotificationService } from '../services/notification.service.js';
export class NotificationController {
    static async getNotifications(req, res) {
        try {
            const data = await NotificationService.getNotifications(req.user.id);
            res.json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async markAsRead(req, res) {
        try {
            await NotificationService.markAsRead(req.user.id, req.params.id);
            res.json({ message: 'Notification marked as read' });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async markAllAsRead(req, res) {
        try {
            await NotificationService.markAllAsRead(req.user.id);
            res.json({ message: 'All notifications marked as read' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async deleteNotification(req, res) {
        try {
            await NotificationService.deleteNotification(req.user.id, req.params.id);
            res.json({ message: 'Notification deleted' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
