import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { IsString, MaxLength } from 'class-validator';

class CreateConversationDto {
  @IsString()
  participantUserId: string;
}

class SendMessageDto {
  @IsString()
  @MaxLength(5000)
  body: string;
}

class MarkReadDto {
  @IsString()
  lastMessageId: string;
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getConversations(@Req() req: any) {
    return this.chatService.getConversations(req.user.id);
  }

  @Post()
  async createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(req.user.id, dto.participantUserId);
  }

  @Get(':conversationId/messages')
  async getMessages(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(conversationId, req.user.id, cursor, limit);
  }

  @Post(':conversationId/messages')
  async sendMessage(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(conversationId, req.user.id, dto.body);
  }

  @Post(':conversationId/read')
  async markRead(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.chatService.markRead(conversationId, req.user.id, dto.lastMessageId);
  }
}
