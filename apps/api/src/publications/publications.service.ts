import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePublicationDto) {
    if (dto.type === 'past_outreach' && dto.outreachDate) {
      const outreachDate = new Date(dto.outreachDate);
      if (outreachDate > new Date()) {
        throw new BadRequestException('Outreach date cannot be in the future');
      }
    }

    if (dto.type === 'future_event' && dto.eventStartAt) {
      const eventStart = new Date(dto.eventStartAt);
      if (eventStart < new Date()) {
        throw new BadRequestException('Event start date must be in the future');
      }
    }

    const publication = await this.prisma.publication.create({
      data: {
        authorId,
        type: dto.type as any,
        title: dto.title,
        narrativeText: dto.narrativeText,
        locationName: dto.locationName,
        outreachDate: dto.outreachDate ? new Date(dto.outreachDate) : undefined,
        eventStartAt: dto.eventStartAt ? new Date(dto.eventStartAt) : undefined,
        eventEndAt: dto.eventEndAt ? new Date(dto.eventEndAt) : undefined,
        ...(dto.type === 'past_outreach' && dto.stats && {
          stats: {
            create: {
              peopleMet: dto.stats.peopleMet || 0,
              peoplePreached: dto.stats.peoplePreached || 0,
              peoplePrayedFor: dto.stats.peoplePrayedFor || 0,
              booksDistributedTotal: dto.stats.booksDistributedTotal || 0,
              tractsDistributedTotal: dto.stats.tractsDistributedTotal || 0,
              housesVisited: dto.stats.housesVisited || 0,
              neighborhoodsCovered: dto.stats.neighborhoodsCovered || 0,
              teamSize: dto.stats.teamSize || 0,
            },
          },
        }),
        ...(dto.materials && {
          materials: {
            create: [
              ...(dto.materials.books || []).map((b) => ({
                category: 'book',
                title: b.title,
                quantity: b.quantity,
              })),
              ...(dto.materials.tracts || []).map((t) => ({
                category: 'tract',
                title: t.title,
                quantity: t.quantity,
              })),
            ],
          },
        }),
        ...(dto.mediaUrls && dto.mediaUrls.length > 0 && {
          media: {
            create: dto.mediaUrls.map((url, i) => ({
              fileKey: url.split('/').pop() || url,
              url,
              order: i,
            })),
          },
        }),
      },
      include: this.fullInclude(),
    });

    return this.formatPublication(publication, authorId);
  }

  async findFeed(query: FeedQueryDto, viewerId: string) {
    const where: Prisma.PublicationWhereInput = {
      status: 'published',
    };

    if (query.type) where.type = query.type as any;
    if (query.authorId) where.authorId = query.authorId;
    if (query.location) where.locationName = { contains: query.location, mode: 'insensitive' };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }
    if (query.q) {
      where.OR = [
        { narrativeText: { contains: query.q, mode: 'insensitive' } },
        { title: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Exclude expired future events by default
    if (!query.includeExpired) {
      where.NOT = {
        AND: [{ type: 'future_event' }, { status: 'expired' }],
      };
    }

    const limit = query.limit || 20;
    const publications = await this.prisma.publication.findMany({
      where,
      include: this.fullInclude(),
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = publications.length > limit;
    const items = hasMore ? publications.slice(0, limit) : publications;

    return {
      items: items.map((p) => this.formatPublication(p, viewerId)),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  async findOne(id: string, viewerId: string) {
    const pub = await this.prisma.publication.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!pub || pub.status === 'deleted') throw new NotFoundException('Publication not found');
    return this.formatPublication(pub, viewerId);
  }

  async update(id: string, userId: string, dto: UpdatePublicationDto) {
    const pub = await this.prisma.publication.findUnique({ where: { id } });
    if (!pub) throw new NotFoundException('Publication not found');
    if (pub.authorId !== userId) throw new ForbiddenException('Not the author');

    const updated = await this.prisma.publication.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.narrativeText !== undefined && { narrativeText: dto.narrativeText }),
        ...(dto.locationName !== undefined && { locationName: dto.locationName }),
        ...(dto.stats && {
          stats: {
            update: {
              peopleMet: dto.stats.peopleMet,
              peoplePreached: dto.stats.peoplePreached,
              peoplePrayedFor: dto.stats.peoplePrayedFor,
              booksDistributedTotal: dto.stats.booksDistributedTotal,
              tractsDistributedTotal: dto.stats.tractsDistributedTotal,
              housesVisited: dto.stats.housesVisited,
              neighborhoodsCovered: dto.stats.neighborhoodsCovered,
              teamSize: dto.stats.teamSize,
            },
          },
        }),
      },
      include: this.fullInclude(),
    });

    return this.formatPublication(updated, userId);
  }

  async remove(id: string, userId: string) {
    const pub = await this.prisma.publication.findUnique({ where: { id } });
    if (!pub) throw new NotFoundException('Publication not found');
    if (pub.authorId !== userId) throw new ForbiddenException('Not the author');

    await this.prisma.publication.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }

  // ==================== COMMENTS ====================

  async getComments(publicationId: string, cursor?: string, limit = 20) {
    const comments = await this.prisma.comment.findMany({
      where: { publicationId },
      include: {
        author: { select: { id: true, displayName: true, profile: { select: { avatarUrl: true } } } },
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
    });
    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    return {
      items: items.map((c) => ({
        id: c.id,
        body: c.body,
        author: {
          id: c.author.id,
          displayName: c.author.displayName,
          avatarUrl: (c.author as any).profile?.avatarUrl ?? null,
        },
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  async createComment(publicationId: string, authorId: string, body: string) {
    const pub = await this.prisma.publication.findUnique({ where: { id: publicationId } });
    if (!pub || pub.status !== 'published') throw new NotFoundException('Publication not found');

    return this.prisma.comment.create({
      data: { publicationId, authorId, body },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async updateComment(commentId: string, userId: string, body: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Not the author');

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body },
    });
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && !['moderator', 'admin'].includes(userRole)) {
      throw new ForbiddenException('Not authorized');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  // ==================== LIKES ====================

  async like(publicationId: string, userId: string) {
    await this.prisma.like.upsert({
      where: { publicationId_userId: { publicationId, userId } },
      create: { publicationId, userId },
      update: {},
    });
  }

  async unlike(publicationId: string, userId: string) {
    await this.prisma.like
      .delete({ where: { publicationId_userId: { publicationId, userId } } })
      .catch(() => {});
  }

  // ==================== SAVES ====================

  async save(publicationId: string, userId: string) {
    await this.prisma.save.upsert({
      where: { publicationId_userId: { publicationId, userId } },
      create: { publicationId, userId },
      update: {},
    });
  }

  async unsave(publicationId: string, userId: string) {
    await this.prisma.save
      .delete({ where: { publicationId_userId: { publicationId, userId } } })
      .catch(() => {});
  }

  async getSavedPublications(userId: string, cursor?: string, limit = 20) {
    const saves = await this.prisma.save.findMany({
      where: { userId },
      include: {
        publication: { include: this.fullInclude() },
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = saves.length > limit;
    const items = hasMore ? saves.slice(0, limit) : saves;
    return {
      items: items.map((s) => this.formatPublication(s.publication as any, userId)),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  // ==================== SHARES ====================

  async share(publicationId: string, userId: string) {
    await this.prisma.share.create({ data: { publicationId, userId } });
  }

  // ==================== HELPERS ====================

  private fullInclude() {
    return {
      author: { select: { id: true, displayName: true, profile: { select: { avatarUrl: true } } } },
      stats: true,
      media: { orderBy: { order: 'asc' as const } },
      materials: true,
      likes: { select: { userId: true } },
      saves: { select: { userId: true } },
      _count: { select: { comments: true, likes: true, saves: true, shares: true } },
    };
  }

  private formatPublication(pub: any, viewerId?: string) {
    return {
      id: pub.id,
      type: pub.type,
      status: pub.status,
      author: {
        id: pub.author.id,
        displayName: pub.author.displayName,
        avatarUrl: pub.author.profile?.avatarUrl,
      },
      title: pub.title,
      narrativeText: pub.narrativeText,
      locationName: pub.locationName,
      outreachDate: pub.outreachDate,
      eventStartAt: pub.eventStartAt,
      eventEndAt: pub.eventEndAt,
      stats: pub.stats
        ? {
            peopleMet: pub.stats.peopleMet,
            peoplePreached: pub.stats.peoplePreached,
            peoplePrayedFor: pub.stats.peoplePrayedFor,
            booksDistributedTotal: pub.stats.booksDistributedTotal,
            tractsDistributedTotal: pub.stats.tractsDistributedTotal,
            housesVisited: pub.stats.housesVisited,
            neighborhoodsCovered: pub.stats.neighborhoodsCovered,
            teamSize: pub.stats.teamSize,
          }
        : undefined,
      media: pub.media?.map((m: any) => ({
        id: m.id,
        url: m.url,
        width: m.width,
        height: m.height,
      })),
      materials: pub.materials,
      counters: {
        likesCount: pub._count?.likes || 0,
        commentsCount: pub._count?.comments || 0,
        savesCount: pub._count?.saves || 0,
        sharesCount: pub._count?.shares || 0,
      },
      viewerState: viewerId
        ? {
            liked: pub.likes?.some((l: any) => l.userId === viewerId) ?? false,
            saved: pub.saves?.some((s: any) => s.userId === viewerId) ?? false,
            canEdit: pub.author.id === viewerId,
          }
        : undefined,
      createdAt: pub.createdAt,
      updatedAt: pub.updatedAt,
    };
  }
}
