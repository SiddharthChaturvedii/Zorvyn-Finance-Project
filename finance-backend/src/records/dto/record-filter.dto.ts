import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecordType } from '@prisma/client';

export class RecordFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ default: 'date', enum: ['date', 'amount', 'category', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'date';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ enum: RecordType })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amountMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amountMax?: number;

  @ApiPropertyOptional({ description: 'Full-text search on description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted records (Admin only)', default: false })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean = false;
}
