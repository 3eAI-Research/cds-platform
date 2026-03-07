import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async createChannel(demandId: string, customerUserId: string, providerUserId: string) {
    // Upsert — return existing if already created
    return this.prisma.chatChannel.upsert({
      where: {
        demandId_customerUserId_providerUserId: {
          demandId,
          customerUserId,
          providerUserId,
        },
      },
      update: {},
      create: {
        demandId,
        customerUserId,
        providerUserId,
      },
    });
  }

  async sendMessage(channelId: string, senderUserId: string, content: string, attachmentKey?: string) {
    // Verify channel exists and sender is a participant
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw new BusinessException(ErrorCode.NOT_FOUND, 'Channel not found', HttpStatus.NOT_FOUND);
    }
    if (channel.customerUserId !== senderUserId && channel.providerUserId !== senderUserId) {
      throw new BusinessException(ErrorCode.AUTH_INSUFFICIENT_ROLE, 'Not a participant of this channel', HttpStatus.FORBIDDEN);
    }
    if (channel.closedAt) {
      throw new BusinessException(ErrorCode.BIZ_INVALID_STATUS_TRANSITION, 'Channel is closed', HttpStatus.BAD_REQUEST);
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        channelId,
        senderUserId,
        content,
        attachmentKey: attachmentKey ?? null,
      },
    });

    // Update lastMessageAt
    await this.prisma.chatChannel.update({
      where: { id: channelId },
      data: { lastMessageAt: new Date() },
    });

    // Notify the other user via WebSocket
    const recipientUserId = channel.customerUserId === senderUserId
      ? channel.providerUserId
      : channel.customerUserId;
    this.realtime.notifyNewMessage(
      recipientUserId,
      channelId,
      senderUserId,
      content.slice(0, 100),
    );

    return message;
  }

  async getChannels(userId: string, page: number | string, pageSize: number | string) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const skip = (p - 1) * ps;

    const where = {
      OR: [
        { customerUserId: userId },
        { providerUserId: userId },
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.chatChannel.findMany({
        where,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: ps,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.chatChannel.count({ where }),
    ]);

    // Add unread count per channel
    const itemsWithUnread = await Promise.all(
      items.map(async (ch) => {
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            channelId: ch.id,
            senderUserId: { not: userId },
            readAt: null,
          },
        });
        return {
          ...ch,
          lastMessage: ch.messages[0] ?? null,
          unreadCount,
        };
      }),
    );

    return { items: itemsWithUnread, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  async getMessages(channelId: string, userId: string, page: number | string, pageSize: number | string) {
    // Verify participant
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw new BusinessException(ErrorCode.NOT_FOUND, 'Channel not found', HttpStatus.NOT_FOUND);
    }
    if (channel.customerUserId !== userId && channel.providerUserId !== userId) {
      throw new BusinessException(ErrorCode.AUTH_INSUFFICIENT_ROLE, 'Not a participant', HttpStatus.FORBIDDEN);
    }

    const p = Number(page) || 1;
    const ps = Number(pageSize) || 50;
    const skip = (p - 1) * ps;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.chatMessage.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: ps,
      }),
      this.prisma.chatMessage.count({ where: { channelId } }),
    ]);

    return { items, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  async markRead(channelId: string, userId: string) {
    // Mark all messages from the other person as read
    await this.prisma.chatMessage.updateMany({
      where: {
        channelId,
        senderUserId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
