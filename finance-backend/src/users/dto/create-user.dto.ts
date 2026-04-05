import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@zorvyn.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'SecureP@ss1' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.VIEWER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
