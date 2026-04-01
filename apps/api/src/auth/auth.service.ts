import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret) {
      this.logger.error('JWT_ACCESS_SECRET is not set!');
    }
    if (!refreshSecret) {
      this.logger.error('JWT_REFRESH_SECRET is not set!');
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    try {
      const passwordHash = await argon2.hash(dto.password);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          displayName: dto.displayName || `${dto.firstName} ${dto.lastName.charAt(0)}.`,
          profile: {
            create: {
              ministryName: dto.ministryName,
            },
          },
        },
        include: { profile: true },
      });

      const tokens = await this.generateTokens(user.id, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
        tokens,
      };
    } catch (error) {
      this.logger.error('Register failed', error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const valid = await argon2.verify(user.passwordHash, dto.password);
      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.generateTokens(user.id, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Login failed', error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = await argon2.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        family: payload.family,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!stored) {
      // Possible token reuse — revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { family: payload.family },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Token reuse detected');
    }

    // Revoke current token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.generateTokens(user.id, user.role, payload.family);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(userId: string, role: string, family?: string) {
    const tokenFamily = family || uuidv4();

    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is not configured');
    }

    const accessToken = this.jwt.sign({
      sub: userId,
      role,
    });

    const refreshTokenPayload = {
      sub: userId,
      family: tokenFamily,
      type: 'refresh',
    };

    const refreshToken = this.jwt.sign(refreshTokenPayload, {
      secret: refreshSecret,
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    const refreshHash = await argon2.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string) {
    try {
      return this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return null;
    }
  }
}
