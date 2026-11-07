import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System health check including database, memory, and runtime modes' })
  async getHealth() {
    const dbHealth = await this.prisma.checkHealth();
    const memory = process.memoryUsage();

    return {
      status: dbHealth.status === 'up' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      database: dbHealth,
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      modes: {
        selfHosted: (process.env.SELF_HOSTED_MODE ?? 'true') === 'true',
        storageDriver: process.env.STORAGE_DRIVER ?? 'local',
        defaultAIProvider: process.env.AI_DEFAULT_PROVIDER ?? 'GEMINI',
        aiKeysConfigured: {
          openai: Boolean(process.env.OPENAI_API_KEY),
          gemini: Boolean(process.env.GEMINI_API_KEY),
          anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        },
      },
    };
  }
}
