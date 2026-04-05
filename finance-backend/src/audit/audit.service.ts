import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { PaginatedResponse } from '../common/types/paginated-response.type';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: AuditFilterDto): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }
}
