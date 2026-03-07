import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';

const MAX_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB per user
const FREE_PERIOD_DAYS = 30;

export interface PhotoStorageResult {
  photoId: string;
  storageKey: string;
  url: string;
  sizeBytes: number;
}

export interface UserStorageInfo {
  usedBytes: number;
  maxBytes: number;
  photoCount: number;
  freePhotos: number;
  billedPhotos: number;
}

@Injectable()
export class PhotoStorageService {
  private readonly logger = new Logger(PhotoStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Store a photo in MinIO and create a PhotoStorage record.
   * Enforces 100 MB per-user quota.
   */
  async storePhoto(
    userId: string,
    sessionId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<PhotoStorageResult> {
    // Check user quota
    const currentUsage = await this.getUserUsedBytes(userId);
    if (currentUsage + buffer.length > MAX_STORAGE_BYTES) {
      throw new BusinessException(
        ErrorCode.BUS_STORAGE_QUOTA_EXCEEDED,
        `Storage quota exceeded. Used: ${Math.round(currentUsage / 1024 / 1024)}MB / ${MAX_STORAGE_BYTES / 1024 / 1024}MB`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Upload to MinIO
    const uploadResult = await this.storageService.upload(
      buffer,
      fileName,
      mimeType,
      `photos/${userId}`,
    );

    // Create DB record
    const freeUntil = new Date();
    freeUntil.setDate(freeUntil.getDate() + FREE_PERIOD_DAYS);

    const photo = await this.prisma.photoStorage.create({
      data: {
        userId,
        sessionId,
        storageKey: uploadResult.key,
        fileName,
        sizeBytes: buffer.length,
        mimeType,
        billingStatus: 'FREE',
        freeUntil,
      },
    });

    this.logger.log(
      `Photo stored: ${photo.id} (${buffer.length} bytes) for user ${userId}`,
    );

    return {
      photoId: photo.id,
      storageKey: uploadResult.key,
      url: uploadResult.url,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Get storage usage for a user.
   */
  async getStorageInfo(userId: string): Promise<UserStorageInfo> {
    const photos = await this.prisma.photoStorage.findMany({
      where: { userId, deletedAt: null },
      select: { sizeBytes: true, billingStatus: true },
    });

    const usedBytes = photos.reduce((sum, p) => sum + p.sizeBytes, 0);
    const freePhotos = photos.filter((p) => p.billingStatus === 'FREE').length;
    const billedPhotos = photos.filter((p) => p.billingStatus === 'BILLED').length;

    return {
      usedBytes,
      maxBytes: MAX_STORAGE_BYTES,
      photoCount: photos.length,
      freePhotos,
      billedPhotos,
    };
  }

  /**
   * Get presigned URL for a stored photo.
   */
  async getPhotoUrl(photoId: string, userId: string): Promise<string> {
    const photo = await this.prisma.photoStorage.findFirst({
      where: { id: photoId, userId, deletedAt: null },
    });

    if (!photo) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Photo not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.storageService.getDownloadUrl(photo.storageKey, 3600);
  }

  /**
   * List all photos for a user.
   */
  async listUserPhotos(userId: string) {
    return this.prisma.photoStorage.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        fileName: true,
        sizeBytes: true,
        mimeType: true,
        billingStatus: true,
        freeUntil: true,
        createdAt: true,
      },
    });
  }

  /**
   * Delete a specific photo (user-initiated).
   */
  async deletePhoto(photoId: string, userId: string): Promise<void> {
    const photo = await this.prisma.photoStorage.findFirst({
      where: { id: photoId, userId, deletedAt: null },
    });

    if (!photo) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Photo not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Delete from MinIO
    await this.storageService.delete(photo.storageKey);

    // Soft-delete in DB
    await this.prisma.photoStorage.update({
      where: { id: photoId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Photo deleted: ${photoId} by user ${userId}`);
  }

  /**
   * Cron: Daily cleanup of expired free-tier photos.
   * Photos past free period with billingStatus=FREE and no payment → delete.
   * Photos with billingStatus=BILLED → keep until next billing cycle.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredPhotos(): Promise<void> {
    const now = new Date();

    // Find expired free-tier photos
    const expiredPhotos = await this.prisma.photoStorage.findMany({
      where: {
        billingStatus: 'FREE',
        freeUntil: { lt: now },
        deletedAt: null,
      },
    });

    if (expiredPhotos.length === 0) return;

    this.logger.log(`Cleaning up ${expiredPhotos.length} expired photos`);

    for (const photo of expiredPhotos) {
      try {
        await this.storageService.delete(photo.storageKey);
        await this.prisma.photoStorage.update({
          where: { id: photo.id },
          data: { deletedAt: now, billingStatus: 'EXPIRED' },
        });
      } catch (err) {
        this.logger.error(`Failed to cleanup photo ${photo.id}: ${err}`);
      }
    }

    this.logger.log(`Cleaned up ${expiredPhotos.length} expired photos`);
  }

  /**
   * Extend storage for a user who pays the monthly fee.
   * Called after successful Stripe payment.
   */
  async extendStorage(userId: string, months: number = 1): Promise<number> {
    const photos = await this.prisma.photoStorage.findMany({
      where: {
        userId,
        deletedAt: null,
        billingStatus: { in: ['FREE', 'BILLED'] },
      },
    });

    const extendDate = new Date();
    extendDate.setMonth(extendDate.getMonth() + months);

    await this.prisma.photoStorage.updateMany({
      where: { id: { in: photos.map((p) => p.id) } },
      data: {
        billingStatus: 'BILLED',
        freeUntil: extendDate,
      },
    });

    this.logger.log(
      `Extended storage for user ${userId}: ${photos.length} photos until ${extendDate.toISOString()}`,
    );

    return photos.length;
  }

  private async getUserUsedBytes(userId: string): Promise<number> {
    const result = await this.prisma.photoStorage.aggregate({
      where: { userId, deletedAt: null },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  }
}
