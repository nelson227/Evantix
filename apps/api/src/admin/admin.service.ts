import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(cursor?: string, limit = 20) {
    const users = await this.prisma.user.findMany({
      include: { profile: true },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, limit) : users;
    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  async updateRole(userId: string, role: string, adminId: string) {
    const validRoles = ['member', 'leader', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });

    await this.createAuditLog(adminId, 'ROLE_CHANGE', 'user', userId, { newRole: role });
  }

  async suspendUser(userId: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await this.createAuditLog(adminId, 'SUSPEND_USER', 'user', userId);
  }

  async unsuspendUser(userId: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
    await this.createAuditLog(adminId, 'UNSUSPEND_USER', 'user', userId);
  }

  async getReports(cursor?: string, limit = 20) {
    const reports = await this.prisma.report.findMany({
      where: { resolvedAt: null },
      include: { reporter: { select: { id: true, displayName: true } } },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, limit) : reports;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  async createReport(reporterId: string, targetType: string, targetId: string, reasonCode: string, details?: string) {
    return this.prisma.report.create({
      data: { reporterId, targetType, targetId, reasonCode, details },
    });
  }

  async resolveReport(reportId: string, resolution: string, adminId: string) {
    await this.prisma.report.update({
      where: { id: reportId },
      data: { resolvedAt: new Date(), resolution },
    });
    await this.createAuditLog(adminId, 'RESOLVE_REPORT', 'report', reportId, { resolution });
  }

  async hidePublication(publicationId: string, adminId: string) {
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: 'hidden' },
    });
    await this.createAuditLog(adminId, 'HIDE_PUBLICATION', 'publication', publicationId);
  }

  async unhidePublication(publicationId: string, adminId: string) {
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: 'published' },
    });
    await this.createAuditLog(adminId, 'UNHIDE_PUBLICATION', 'publication', publicationId);
  }

  async getAuditLogs(cursor?: string, limit = 50) {
    const logs = await this.prisma.auditLog.findMany({
      include: { user: { select: { id: true, displayName: true } } },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  private async createAuditLog(
    userId: string,
    action: string,
    target: string,
    targetId?: string,
    metadata?: Record<string, any>,
  ) {
    await this.prisma.auditLog.create({
      data: { userId, action, target, targetId, metadata },
    });
  }
}
