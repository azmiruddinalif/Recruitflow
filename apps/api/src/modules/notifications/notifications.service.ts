import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, organizationId?: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
          ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
        },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string, organizationId?: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        ...(organizationId ? { organizationId } : {}),
      },
      data: { isRead: true, readAt: new Date() },
    });

    return { updated: true };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { deleted: true, id: notificationId };
  }
}
