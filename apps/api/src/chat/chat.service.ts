import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: { id: true, displayName: true, profile: { select: { avatarUrl: true } } },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => {
      const other = m.conversation.members[0]?.user;
      const lastMsg = m.conversation.messages[0];
      return {
        id: m.conversation.id,
        participant: other
          ? { id: other.id, displayName: other.displayName, avatarUrl: other.profile?.avatarUrl }
          : null,
        lastMessage: lastMsg
          ? { body: lastMsg.body, createdAt: lastMsg.createdAt, senderId: lastMsg.senderId }
          : null,
        unreadCount: 0, // To be computed from lastReadAt
      };
    });
  }

  async createConversation(userId: string, participantId: string) {
    // Check if conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: participantId } } },
        ],
      },
    });

    if (existing) return { id: existing.id };

    // Verify participant exists
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId, isActive: true },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const conversation = await this.prisma.conversation.create({
      data: {
        members: {
          create: [{ userId }, { userId: participantId }],
        },
      },
    });

    return { id: conversation.id };
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
    await this.verifyMembership(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return {
      items: items.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  async sendMessage(conversationId: string, senderId: string, body: string) {
    await this.verifyMembership(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, body },
    });

    // Touch conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt,
    };
  }

  async markRead(conversationId: string, userId: string, lastMessageId: string) {
    await this.verifyMembership(conversationId, userId);

    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  private async verifyMembership(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');
  }
}
