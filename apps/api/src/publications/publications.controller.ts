import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicationsService } from './publications.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@ApiTags('Publications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreatePublicationDto) {
    return this.publicationsService.create(req.user.id, dto);
  }

  @Get()
  async findFeed(@Req() req: any, @Query() query: FeedQueryDto) {
    return this.publicationsService.findFeed(query, req.user.id);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.publicationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePublicationDto) {
    return this.publicationsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.publicationsService.remove(id, req.user.id);
  }
}
