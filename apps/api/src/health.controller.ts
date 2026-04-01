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
    let tables: string[] = [];
    let dbError = '';
    try {
      const result = await this.prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      db = 'connected';
      tables = result.map((r) => r.tablename);
    } catch (e) {
      db = 'error';
      dbError = e instanceof Error ? e.message : String(e);
    }
    return {
      status: db === 'connected' ? 'ok' : 'degraded',
      db,
      tables,
      dbError: dbError || undefined,
      timestamp: new Date().toISOString(),
    };
  }
}
