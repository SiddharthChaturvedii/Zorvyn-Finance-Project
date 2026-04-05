import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user with default VIEWER role
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        hashedPassword,
        role: Role.VIEWER,
      },
    });

    // Issue tokens
    const tokens = await this.issueTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user — generic error for security
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const valid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check active status
    if (!user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Issue tokens
    const tokens = await this.issueTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(rawRefreshToken: string) {
    // Find all non-revoked, non-expired tokens for this comparison
    // We must iterate because the hash is bcrypt (non-deterministic)
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    // Find matching token by comparing bcrypt hashes
    let matchedToken: (typeof storedTokens)[0] | null = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, stored.tokenHash);
      if (isMatch) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check user is still active
    if (!matchedToken.user.isActive) {
      throw new UnauthorizedException('Account inactive or not found');
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new tokens
    const tokens = await this.issueTokens(
      matchedToken.user.id,
      matchedToken.user.role,
    );

    return tokens;
  }

  async logout(rawRefreshToken: string) {
    // Find and revoke the refresh token
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null },
    });

    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, stored.tokenHash);
      if (isMatch) {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    // Always return success (don't leak token validity)
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  // Private Helpers

  private async issueTokens(userId: string, role: Role) {
    // Access token (JWT)
    const accessPayload: JwtPayload = {
      sub: userId,
      role,
      type: 'access',
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.config.get('ACCESS_TOKEN_EXPIRES_IN') || '15m',
    });

    // Refresh token (random UUID, stored as bcrypt hash)
    const rawRefreshToken = randomUUID();
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 10);
    const expiresInDays = parseInt(
      this.config.get('REFRESH_TOKEN_EXPIRES_IN_DAYS') || '7',
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private sanitizeUser(user: any) {
    const { hashedPassword, ...sanitized } = user;
    return sanitized;
  }
}
