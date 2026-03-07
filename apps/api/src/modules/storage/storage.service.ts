import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: Minio.Client;
  private bucket!: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'cds-uploads');
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: Number(this.config.get<string>('MINIO_PORT', '9000')),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
      this.logger.log(`Storage connected: ${this.bucket}`);
    } catch (err) {
      this.logger.warn(`MinIO not available, storage features disabled: ${err}`);
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    folder: string = 'general',
  ): Promise<UploadResult> {
    const ext = originalName.split('.').pop() ?? 'bin';
    const key = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
      'X-Original-Name': originalName,
    });

    const url = await this.client.presignedGetObject(this.bucket, key, 7 * 24 * 3600);

    this.logger.log(`Uploaded: ${key} (${buffer.length} bytes)`);

    return {
      key,
      url,
      bucket: this.bucket,
      size: buffer.length,
      contentType,
    };
  }

  async getDownloadUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
    this.logger.log(`Deleted: ${key}`);
  }
}
