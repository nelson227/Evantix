import { Controller, Get, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @Patch('me/profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get('members')
  async listMembers(@Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return this.usersService.listMembers(cursor, limit);
  }

  @Get('members/:memberId')
  async getMember(@Param('memberId') memberId: string) {
    return this.usersService.getMember(memberId);
  }
}
