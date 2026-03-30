import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

// Maps metric types to the corresponding PublicationStats field
const METRIC_FIELD_MAP: Record<string, string> = {
  people_met: 'peopleMet',
  people_preached: 'peoplePreached',
  people_prayed_for: 'peoplePrayedFor',
  books_distributed_total: 'booksDistributedTotal',
  tracts_distributed_total: 'tractsDistributedTotal',
};

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        metricType: dto.metricType,
        targetValue: dto.targetValue,
        startDate,
        endDate,
        description: dto.description,
      },
    });

    // Optional backfill: count existing publications in date range
    if (dto.backfillMode === 'include_existing_in_range') {
      await this.backfillGoal(goal.id, userId, dto.metricType, startDate, endDate);
    }

    return this.formatGoal(
      await this.prisma.goal.findUnique({ where: { id: goal.id } }),
    );
  }

  async findAll(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map(this.formatGoal);
  }

  async findOne(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');
    return this.formatGoal(goal);
  }

  async update(goalId: string, userId: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');

    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
    return this.formatGoal(updated);
  }

  async pause(goalId: string, userId: string) {
    return this.changeStatus(goalId, userId, 'active', 'paused');
  }

  async resume(goalId: string, userId: string) {
    return this.changeStatus(goalId, userId, 'paused', 'active');
  }

  async cancel(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');

    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data: { status: 'cancelled' },
    });
    return this.formatGoal(updated);
  }

  async getContributions(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');

    return this.prisma.goalContribution.findMany({
      where: { goalId },
      include: {
        publication: { select: { id: true, title: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Called by the goal-contribution worker when a publication is created/updated.
   * Computes and stores the contribution for all matching active goals.
   */
  async processPublicationForGoals(publicationId: string, authorId: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      include: { stats: true },
    });

    if (!publication || publication.status !== 'published' || publication.type !== 'past_outreach') {
      return;
    }

    const goals = await this.prisma.goal.findMany({
      where: {
        userId: authorId,
        status: 'active',
        startDate: { lte: publication.outreachDate || publication.createdAt },
        endDate: { gte: publication.outreachDate || publication.createdAt },
      },
    });

    for (const goal of goals) {
      const field = METRIC_FIELD_MAP[goal.metricType];
      if (!field || !publication.stats) continue;

      const value = (publication.stats as any)[field] || 0;
      if (value <= 0) continue;

      // Upsert contribution (idempotent)
      await this.prisma.goalContribution.upsert({
        where: { goalId_publicationId: { goalId: goal.id, publicationId } },
        create: {
          goalId: goal.id,
          publicationId,
          metricType: goal.metricType,
          contributionValue: value,
        },
        update: { contributionValue: value },
      });

      // Recalculate total
      const totalResult = await this.prisma.goalContribution.aggregate({
        where: { goalId: goal.id },
        _sum: { contributionValue: true },
      });
      const newTotal = totalResult._sum.contributionValue || 0;

      await this.prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentValue: newTotal,
          status: newTotal >= goal.targetValue ? 'completed' : 'active',
        },
      });
    }
  }

  /**
   * Reverses contributions when a publication is deleted/hidden.
   */
  async reversePublicationContributions(publicationId: string) {
    const contributions = await this.prisma.goalContribution.findMany({
      where: { publicationId },
    });

    for (const contrib of contributions) {
      await this.prisma.goalContribution.delete({ where: { id: contrib.id } });

      const totalResult = await this.prisma.goalContribution.aggregate({
        where: { goalId: contrib.goalId },
        _sum: { contributionValue: true },
      });
      const newTotal = totalResult._sum.contributionValue || 0;

      const goal = await this.prisma.goal.findUnique({ where: { id: contrib.goalId } });
      await this.prisma.goal.update({
        where: { id: contrib.goalId },
        data: {
          currentValue: newTotal,
          status: goal && newTotal >= goal.targetValue ? 'completed' : 'active',
        },
      });
    }
  }

  private async backfillGoal(
    goalId: string,
    userId: string,
    metricType: string,
    startDate: Date,
    endDate: Date,
  ) {
    const field = METRIC_FIELD_MAP[metricType];
    if (!field) return;

    const publications = await this.prisma.publication.findMany({
      where: {
        authorId: userId,
        type: 'past_outreach',
        status: 'published',
        outreachDate: { gte: startDate, lte: endDate },
      },
      include: { stats: true },
    });

    let total = 0;
    for (const pub of publications) {
      const value = pub.stats ? (pub.stats as any)[field] || 0 : 0;
      if (value <= 0) continue;

      await this.prisma.goalContribution.create({
        data: {
          goalId,
          publicationId: pub.id,
          metricType,
          contributionValue: value,
        },
      });
      total += value;
    }

    if (total > 0) {
      await this.prisma.goal.update({
        where: { id: goalId },
        data: { currentValue: total },
      });
    }
  }

  private async changeStatus(goalId: string, userId: string, fromStatus: string, toStatus: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.userId !== userId) throw new ForbiddenException('Not your goal');
    if (goal.status !== fromStatus) {
      throw new BadRequestException(`Goal must be ${fromStatus} to ${toStatus}`);
    }
    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data: { status: toStatus as any },
    });
    return this.formatGoal(updated);
  }

  private formatGoal(goal: any) {
    const progressPercent =
      goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
    return {
      id: goal.id,
      title: goal.title,
      metricType: goal.metricType,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      startDate: goal.startDate,
      endDate: goal.endDate,
      status: goal.status,
      progressPercent,
      remainingValue: Math.max(0, goal.targetValue - goal.currentValue),
      description: goal.description,
      createdAt: goal.createdAt,
    };
  }
}
