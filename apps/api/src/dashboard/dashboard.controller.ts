import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('personal')
  async getPersonal(@Req() req: any) {
    return this.dashboardService.getPersonalDashboard(req.user.id);
  }

  @Get('global')
  @UseGuards(RolesGuard)
  @Roles('leader', 'moderator', 'admin')
  async getGlobal(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('location') location?: string,
    @Query('member_id') memberId?: string,
  ) {
    return this.dashboardService.getGlobalDashboard({ dateFrom, dateTo, location, memberId });
  }
}
