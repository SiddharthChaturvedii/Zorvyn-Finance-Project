import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { PatchRecordDto } from './dto/patch-record.dto';
import { RecordFilterDto } from './dto/record-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { JwtPayload } from '../common/types/jwt-payload.type';

@ApiTags('Records')
@Controller('records')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List records with filters and pagination' })
  async findAll(
    @Query() filters: RecordFilterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.findAll(filters, user);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List distinct categories' })
  async getCategories() {
    return this.recordsService.getCategories();
  }

  @Get('export')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Export records as CSV' })
  async exportCsv(
    @Query() filters: RecordFilterDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csv = await this.recordsService.exportRecords(filters, user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=financial_records.csv');
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single record by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.findOne(id, user);
  }

  @Post()
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Create a financial record' })
  @ApiResponse({ status: 201, description: 'Record created' })
  async create(
    @Body() dto: CreateRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.create(dto, user.sub);
  }

  @Put(':id')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Full update record' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.update(id, dto, user);
  }

  @Patch(':id')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Partial update record' })
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.patch(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ANALYST, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete record' })
  @ApiResponse({ status: 204, description: 'Record soft-deleted' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.recordsService.softDelete(id, user);
  }

  @Post(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Restore soft-deleted record (Admin only)' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordsService.restore(id);
  }
}
