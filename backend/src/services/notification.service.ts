import { prisma } from '../config/db.js';

export class NotificationService {
  /**
   * Get all notifications and unread counter
   */
  static async getNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Mark single notification as read
   */
  static async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(userId: string, notificationId: string) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Create a notification helper
   */
  static async create(userId: string, data: {
    type?: string;
    title: string;
    message: string;
  }) {
    return prisma.notification.create({
      data: {
        userId,
        type: data.type || 'INFO',
        title: data.title,
        message: data.message,
      },
    });
  }
}
