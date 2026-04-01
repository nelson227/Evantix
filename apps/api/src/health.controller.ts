import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'connected';
    } catch {
      db = 'error';
    }
    return {
      status: db === 'connected' ? 'ok' : 'degraded',
      db,
      timestamp: new Date().toISOString(),
    };
  }
}
