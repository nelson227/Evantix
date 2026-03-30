import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.profile.upsert({
      where: { userId },
      update: {
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.ministryName !== undefined && { ministryName: dto.ministryName }),
        ...(dto.favoriteBibleVerse !== undefined && { favoriteBibleVerse: dto.favoriteBibleVerse }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      create: {
        userId,
        bio: dto.bio,
        city: dto.city,
        country: dto.country,
        ministryName: dto.ministryName,
        favoriteBibleVerse: dto.favoriteBibleVerse,
        phoneNumber: dto.phoneNumber,
        avatarUrl: dto.avatarUrl,
      },
    });

    if (dto.displayName) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { displayName: dto.displayName },
      });
    }

    return this.getMe(userId);
  }

  async getMember(memberId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: memberId, isActive: true },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('Member not found');
    return this.formatUser(user);
  }

  async listMembers(cursor?: string, limit = 20) {
    const members = await this.prisma.user.findMany({
      where: { isActive: true },
      include: { profile: true },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = members.length > limit;
    const items = hasMore ? members.slice(0, limit) : members;
    return {
      items: items.map(this.formatUser),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      role: user.role,
      joinedAt: user.createdAt,
      avatarUrl: user.profile?.avatarUrl,
      bio: user.profile?.bio,
      city: user.profile?.city,
      country: user.profile?.country,
      ministryName: user.profile?.ministryName,
      favoriteBibleVerse: user.profile?.favoriteBibleVerse,
    };
  }
}
