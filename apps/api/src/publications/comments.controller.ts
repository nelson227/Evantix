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
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('publications/:publicationId/comments')
export class CommentsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get()
  async getComments(
    @Param('publicationId') publicationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.publicationsService.getComments(publicationId, cursor, limit);
  }

  @Post()
  async createComment(
    @Param('publicationId') publicationId: string,
    @Req() req: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.publicationsService.createComment(publicationId, req.user.id, dto.body);
  }

  @Patch(':commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Req() req: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.publicationsService.updateComment(commentId, req.user.id, dto.body);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('commentId') commentId: string, @Req() req: any) {
    await this.publicationsService.deleteComment(commentId, req.user.id, req.user.role);
  }
}
