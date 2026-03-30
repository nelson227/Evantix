import {
  Controller,
  Post,
  Delete,
  Get,
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

@ApiTags('Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InteractionsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  // ==================== LIKES ====================
  @Post('publications/:publicationId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async like(@Param('publicationId') publicationId: string, @Req() req: any) {
    await this.publicationsService.like(publicationId, req.user.id);
  }

  @Delete('publications/:publicationId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(@Param('publicationId') publicationId: string, @Req() req: any) {
    await this.publicationsService.unlike(publicationId, req.user.id);
  }

  // ==================== SAVES ====================
  @Post('publications/:publicationId/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  async save(@Param('publicationId') publicationId: string, @Req() req: any) {
    await this.publicationsService.save(publicationId, req.user.id);
  }

  @Delete('publications/:publicationId/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsave(@Param('publicationId') publicationId: string, @Req() req: any) {
    await this.publicationsService.unsave(publicationId, req.user.id);
  }

  @Get('me/saved-publications')
  async getSavedPublications(
    @Req() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.publicationsService.getSavedPublications(req.user.id, cursor, limit);
  }

  // ==================== SHARES ====================
  @Post('publications/:publicationId/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  async share(@Param('publicationId') publicationId: string, @Req() req: any) {
    await this.publicationsService.share(publicationId, req.user.id);
  }
}
