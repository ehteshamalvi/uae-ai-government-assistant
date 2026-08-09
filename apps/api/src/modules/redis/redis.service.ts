import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisClientLike } from '../../providers/redis.interface';

@Injectable()
export class RedisService implements RedisClientLike, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly memory = new Map<
    string,
    { value: string; expiresAt?: number }
  >();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('redisUrl') ?? 'redis://localhost:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    this.client.on('error', (error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.client) return false;
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `Redis unavailable, using memory fallback: ${String(error)}`,
      );
      return false;
    }
  }

  async ping(): Promise<string> {
    const connected = await this.ensureConnected();
    if (!connected || !this.client) return 'PONG';
    try {
      return await this.client.ping();
    } catch {
      return 'PONG';
    }
  }

  /** Reports whether Redis is live or using in-memory fallback (no secrets). */
  async connectionStatus(): Promise<'ok' | 'fallback'> {
    const connected = await this.ensureConnected();
    if (!connected || !this.client) return 'fallback';
    try {
      const pong = await this.client.ping();
      return pong === 'PONG' ? 'ok' : 'fallback';
    } catch {
      return 'fallback';
    }
  }

  async get(key: string): Promise<string | null> {
    const connected = await this.ensureConnected();
    if (connected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // fall through
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const connected = await this.ensureConnected();
    if (connected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fall through
      }
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async quit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
