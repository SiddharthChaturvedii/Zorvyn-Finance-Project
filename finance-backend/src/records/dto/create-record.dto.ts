import { IsNumber, IsEnum, IsString, IsOptional, IsDateString, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RecordType } from '@prisma/client';

export class CreateRecordDto {
  @ApiProperty({ example: 50000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: RecordType, example: 'INCOME' })
  @IsEnum(RecordType)
  type: RecordType;

  @ApiProperty({ example: 'Revenue' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  category: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Monthly subscription revenue' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
