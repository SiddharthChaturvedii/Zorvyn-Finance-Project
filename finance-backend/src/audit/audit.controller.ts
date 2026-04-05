import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (Admin only)' })
  async findAll(@Query() filters: AuditFilterDto) {
    return this.auditService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single audit log detail (Admin only)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.findOne(id);
  }
}
