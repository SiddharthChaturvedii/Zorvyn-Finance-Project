import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@zorvyn.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
  password: string;
}
