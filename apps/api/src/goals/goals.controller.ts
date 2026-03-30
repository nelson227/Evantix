import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@ApiTags('Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.goalsService.findAll(req.user.id);
  }

  @Get(':goalId')
  async findOne(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.findOne(goalId, req.user.id);
  }

  @Patch(':goalId')
  async update(@Req() req: any, @Param('goalId') goalId: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(goalId, req.user.id, dto);
  }

  @Post(':goalId/pause')
  async pause(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.pause(goalId, req.user.id);
  }

  @Post(':goalId/resume')
  async resume(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.resume(goalId, req.user.id);
  }

  @Post(':goalId/cancel')
  async cancel(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.cancel(goalId, req.user.id);
  }

  @Get(':goalId/contributions')
  async getContributions(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.getContributions(goalId, req.user.id);
  }
}
