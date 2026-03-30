import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(['member', 'leader', 'moderator', 'admin'])
  role: string;
}

class CreateReportDto {
  @IsEnum(['publication', 'comment', 'user'])
  targetType: string;

  @IsString()
  targetId: string;

  @IsString()
  reasonCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

class ResolveReportDto {
  @IsString()
  @MaxLength(500)
  resolution: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Reports (accessible to all authenticated users for creating)
  @Post('reports')
  async createReport(@Req() req: any, @Body() dto: CreateReportDto) {
    return this.adminService.createReport(
      req.user.id,
      dto.targetType,
      dto.targetId,
      dto.reasonCode,
      dto.details,
    );
  }

  // Admin-only endpoints
  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUsers(@Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.adminService.getUsers(cursor, limit);
  }

  @Patch('admin/users/:userId/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateRole(@Req() req: any, @Param('userId') userId: string, @Body() dto: UpdateRoleDto) {
    await this.adminService.updateRole(userId, dto.role, req.user.id);
  }

  @Post('admin/users/:userId/suspend')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspendUser(@Req() req: any, @Param('userId') userId: string) {
    await this.adminService.suspendUser(userId, req.user.id);
  }

  @Post('admin/users/:userId/unsuspend')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsuspendUser(@Req() req: any, @Param('userId') userId: string) {
    await this.adminService.unsuspendUser(userId, req.user.id);
  }

  @Get('admin/reports')
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  async getReports(@Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.adminService.getReports(cursor, limit);
  }

  @Post('admin/reports/:reportId/resolve')
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resolveReport(
    @Req() req: any,
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    await this.adminService.resolveReport(reportId, dto.resolution, req.user.id);
  }

  @Post('admin/publications/:publicationId/hide')
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hidePublication(@Req() req: any, @Param('publicationId') publicationId: string) {
    await this.adminService.hidePublication(publicationId, req.user.id);
  }

  @Post('admin/publications/:publicationId/unhide')
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unhidePublication(@Req() req: any, @Param('publicationId') publicationId: string) {
    await this.adminService.unhidePublication(publicationId, req.user.id);
  }

  @Get('admin/audit-logs')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAuditLogs(@Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(cursor, limit);
  }
}
