import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonalDashboard(userId: string) {
    const [publicationsCount, statsAgg, goalsCount, completedGoals, monthlyTrends] =
      await Promise.all([
        this.prisma.publication.count({
          where: { authorId: userId, status: 'published' },
        }),
        this.prisma.publicationStats.aggregate({
          where: { publication: { authorId: userId, status: 'published' } },
          _sum: {
            peopleMet: true,
            peoplePreached: true,
            peoplePrayedFor: true,
            booksDistributedTotal: true,
            tractsDistributedTotal: true,
          },
        }),
        this.prisma.goal.count({ where: { userId, status: 'active' } }),
        this.prisma.goal.count({ where: { userId, status: 'completed' } }),
        this.getMonthlyTrends(userId),
      ]);

    return {
      summary: {
        publicationsCount,
        peopleMetTotal: statsAgg._sum.peopleMet || 0,
        peoplePrachedTotal: statsAgg._sum.peoplePreached || 0,
        peoplePrayedForTotal: statsAgg._sum.peoplePrayedFor || 0,
        booksDistributedTotal: statsAgg._sum.booksDistributedTotal || 0,
        tractsDistributedTotal: statsAgg._sum.tractsDistributedTotal || 0,
      },
      goals: {
        activeCount: goalsCount,
        completedCount: completedGoals,
      },
      trends: { monthly: monthlyTrends },
    };
  }

  async getGlobalDashboard(filters: {
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    memberId?: string;
  }) {
    const where: any = { status: 'published' };
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
      };
    }
    if (filters.location) where.locationName = { contains: filters.location, mode: 'insensitive' };
    if (filters.memberId) where.authorId = filters.memberId;

    const [publicationsCount, statsAgg, membersCount] = await Promise.all([
      this.prisma.publication.count({ where }),
      this.prisma.publicationStats.aggregate({
        where: { publication: where },
        _sum: {
          peopleMet: true,
          peoplePreached: true,
          peoplePrayedFor: true,
          booksDistributedTotal: true,
          tractsDistributedTotal: true,
        },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      summary: {
        publicationsCount,
        membersCount,
        peopleMetTotal: statsAgg._sum.peopleMet || 0,
        peoplePrachedTotal: statsAgg._sum.peoplePreached || 0,
        peoplePrayedForTotal: statsAgg._sum.peoplePrayedFor || 0,
        booksDistributedTotal: statsAgg._sum.booksDistributedTotal || 0,
        tractsDistributedTotal: statsAgg._sum.tractsDistributedTotal || 0,
      },
    };
  }

  private async getMonthlyTrends(userId: string) {
    // Get publications from the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const publications = await this.prisma.publication.findMany({
      where: {
        authorId: userId,
        status: 'published',
        type: 'past_outreach',
        createdAt: { gte: twelveMonthsAgo },
      },
      include: { stats: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthMap = new Map<string, { peoplePreached: number; publicationsCount: number }>();
    for (const pub of publications) {
      const month = pub.createdAt.toISOString().slice(0, 7);
      const existing = monthMap.get(month) || { peoplePreached: 0, publicationsCount: 0 };
      existing.publicationsCount++;
      existing.peoplePreached += pub.stats?.peoplePreached || 0;
      monthMap.set(month, existing);
    }

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }
}
