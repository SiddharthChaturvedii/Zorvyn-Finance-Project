import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { PatchRecordDto } from './dto/patch-record.dto';
import { RecordFilterDto } from './dto/record-filter.dto';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { Role, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../common/types/paginated-response.type';
import { RedisService } from './redis.service';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(
    filters: RecordFilterDto,
    user: JwtPayload,
  ): Promise<PaginatedResponse<any>> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    // VIEWER can only see own records
    if (user.role === Role.VIEWER) {
      where.createdById = user.sub;
    }

    // Soft delete filter — only ADMIN can see deleted
    if (user.role === Role.ADMIN && filters.includeDeleted) {
      // No isDeleted filter — show all
    } else {
      where.isDeleted = false;
    }

    // Type filter
    if (filters.type) where.type = filters.type;

    // Category filter (case-insensitive)
    if (filters.category) {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    // Amount range
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where.amount = {};
      if (filters.amountMin !== undefined) where.amount.gte = filters.amountMin;
      if (filters.amountMax !== undefined) where.amount.lte = filters.amountMax;
    }

    // Search on description
    if (filters.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    // Sort
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = { [sortBy]: sortOrder };

    const [records, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Serialize amount as string
    const data = records.map((r) => ({
      ...r,
      amount: r.amount.toString(),
    }));

    return {
      data,
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

  async findOne(id: string, user: JwtPayload) {
    const record = await this.prisma.financialRecord.findFirst({
      where: { id, isDeleted: false },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!record) throw new NotFoundException(`Record ${id} not found`);

    // Object-level permission: VIEWER and ANALYST can only access own records
    if (user.role !== Role.ADMIN && record.createdById !== user.sub) {
      throw new ForbiddenException('You do not have access to this record');
    }

    return { ...record, amount: record.amount.toString() };
  }

  async create(dto: CreateRecordDto, userId: string) {
    const record = await this.prisma.financialRecord.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        date: new Date(dto.date),
        description: dto.description,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Invalidate dashboard cache
    await this.redis.invalidateDashboardCache();

    return { ...record, amount: record.amount.toString() };
  }

  async update(id: string, dto: UpdateRecordDto, user: JwtPayload) {
    const existing = await this.findOneInternal(id);
    this.checkObjectPermission(existing, user);

    const record = await this.prisma.financialRecord.update({
      where: { id },
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        date: new Date(dto.date),
        description: dto.description,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.redis.invalidateDashboardCache();

    return { ...record, amount: record.amount.toString() };
  }

  async patch(id: string, dto: PatchRecordDto, user: JwtPayload) {
    const existing = await this.findOneInternal(id);
    this.checkObjectPermission(existing, user);

    const data: any = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.description !== undefined) data.description = dto.description;

    const record = await this.prisma.financialRecord.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.redis.invalidateDashboardCache();

    return { ...record, amount: record.amount.toString() };
  }

  async softDelete(id: string, user: JwtPayload) {
    const existing = await this.findOneInternal(id);
    this.checkObjectPermission(existing, user);

    await this.prisma.financialRecord.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await this.redis.invalidateDashboardCache();
  }

  async restore(id: string) {
    const record = await this.prisma.financialRecord.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);
    if (!record.isDeleted) {
      throw new ConflictException('Record is not deleted');
    }

    const restored = await this.prisma.financialRecord.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.redis.invalidateDashboardCache();

    return { ...restored, amount: restored.amount.toString() };
  }

  async getCategories() {
    const cached = await this.redis.get('financeapp:records:categories');
    if (cached) return JSON.parse(cached);

    const categories = await this.prisma.financialRecord.findMany({
      where: { isDeleted: false },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    const result = categories.map((c) => c.category);
    await this.redis.set('financeapp:records:categories', JSON.stringify(result), 600);
    return result;
  }

  async exportRecords(filters: RecordFilterDto, user: JwtPayload): Promise<string> {
    // Get all records without pagination for export
    const where: any = { isDeleted: false };

    if (filters.type) where.type = filters.type;
    if (filters.category) {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    const records = await this.prisma.financialRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    // Build CSV
    const headers = 'ID,Amount,Type,Category,Date,Description,Created By,Created At\n';
    const rows = records
      .map(
        (r) =>
          `${r.id},${r.amount},${r.type},${r.category},${r.date.toISOString().split('T')[0]},"${r.description || ''}",${r.createdBy.fullName},${r.createdAt.toISOString()}`,
      )
      .join('\n');

    return headers + rows;
  }

  // Private

  private async findOneInternal(id: string) {
    const record = await this.prisma.financialRecord.findFirst({
      where: { id, isDeleted: false },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);
    return record;
  }

  private checkObjectPermission(record: any, user: JwtPayload) {
    if (user.role === Role.ADMIN) return; // Admin has full access
    if (record.createdById !== user.sub) {
      throw new ForbiddenException('You do not have access to this record');
    }
  }
}
