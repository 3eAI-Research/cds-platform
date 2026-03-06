import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });
    this.on('connect', () => this.logger.log('Redis connected'));
    this.on('error', (err) => this.logger.error('Redis error', err.message));
  }

  async onModuleDestroy() {
    await this.quit();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const json = JSON.stringify(value);
    if (ttlSeconds) {
      await this.set(key, json, 'EX', ttlSeconds);
    } else {
      await this.set(key, json);
    }
  }
}
