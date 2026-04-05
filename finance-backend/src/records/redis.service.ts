import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => {
      console.warn('Redis connection error (cache will be bypassed):', err.message);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      // Cache write failure is non-critical
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // Non-critical
    }
  }

  async invalidateDashboardCache(): Promise<void> {
    try {
      const keys = await this.client.keys('financeapp:dashboard:*');
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      await this.client.del('financeapp:records:categories');
    } catch {
      // Non-critical
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
