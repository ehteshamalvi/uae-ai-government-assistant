import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { DemoModeService } from '../demo/demo-mode.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly demoMode: DemoModeService,
  ) {}

  async getHealth() {
    let database: 'ok' | 'degraded' = 'ok';
    let redisStatus: 'ok' | 'fallback' | 'degraded' = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'degraded';
    }

    try {
      redisStatus = await this.redis.connectionStatus();
    } catch {
      redisStatus = 'degraded';
    }

    const overall =
      database === 'ok' && redisStatus !== 'degraded' ? 'ok' : 'degraded';

    return {
      status: overall,
      service: 'govflow-api',
      environment: this.config.get<string>('nodeEnv') ?? 'development',
      demoMode: this.demoMode.isEnabled(),
      sandboxControls: this.demoMode.allowSandboxControls(),
      ai: {
        provider: this.config.get<string>('aiProvider') ?? 'mock',
        status: 'ok',
      },
      checks: {
        database,
        redis: redisStatus,
        api: 'ok' as const,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
