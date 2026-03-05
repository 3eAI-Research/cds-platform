import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '../../../common/exceptions/business.exception';

/**
 * Notification service — MVP in-app notification store.
 *
 * Phase 2: email/push delivery via Resend/FCM.
 * For now, notifications are stored in DB and served via REST.
 */

export interface CreateNotificationInput {
  recipientUserId: string;
  recipientEmail?: string;
  type: string;
  subject: string;
  body: string;
  referenceType?: string;
  referenceId?: string;
}

export interface NotificationResponseDto {
  id: string;
  recipientUserId: string;
  type: string;
  channel: string;
  status: string;
  subject: string;
  body: string;
  referenceType?: string | null;
  referenceId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an in-app notification record.
   * Called by event handlers when domain events occur.
   */
  async create(input: CreateNotificationInput): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        recipientEmail: input.recipientEmail ?? 'noreply@cds-platform.de',
        type: input.type,
        channel: 'IN_APP',
        status: 'SENT', // In-app = immediately available
        subject: input.subject,
        body: input.body,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        sentAt: new Date(),
      },
    });

    return this.toResponseDto(notification);
  }

  /**
   * Get notification by ID.
   */
  async findById(id: string): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification', id);
    }

    return this.toResponseDto(notification);
  }

  /**
   * List notifications for a user with pagination.
   */
  async findByUser(params: {
    userId: string;
    page: number;
    pageSize: number;
    unreadOnly?: boolean;
  }) {
    const { userId, page, pageSize, unreadOnly } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { recipientUserId: userId };
    if (unreadOnly) where.readAt = null;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((n) => this.toResponseDto(n)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Mark notification as read.
   */
  async markAsRead(id: string): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification', id);
    }

    if (notification.readAt) {
      return this.toResponseDto(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }

  private toResponseDto(notification: {
    id: string;
    recipientUserId: string;
    type: string;
    channel: string;
    status: string;
    subject: string;
    body: string;
    referenceType: string | null;
    referenceId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationResponseDto {
    return {
      id: notification.id,
      recipientUserId: notification.recipientUserId,
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      subject: notification.subject,
      body: notification.body,
      referenceType: notification.referenceType,
      referenceId: notification.referenceId,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
