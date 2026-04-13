import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. استخدام الدالة الخاصة التي تجلب الباسورد
    const user = await this.userService.findByEmailWithPassword(email);

    // 2. التحقق من صحة البيانات
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. التحقق من التفعيل
    if (!user.isVerified) {
      throw new UnauthorizedException('Email verification required');
    }

    // 4. تجهيز التوكن مع tokenVersion
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.type,
      tokenVersion: user.tokenVersion,
    };

    // Generate access token
    const access_token = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = this.generateRefreshToken();
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Save refresh token
    const refreshTokenEntity = new RefreshToken();
    refreshTokenEntity.token = hashedRefreshToken;
    refreshTokenEntity.user = user;
    refreshTokenEntity.userId = user.id;
    refreshTokenEntity.expiresAt = new Date(Date.now() + this.parseTimeToMs(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '30d')));
    refreshTokenEntity.isRevoked = false;
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      message: 'Login successful',
      access_token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(refreshTokenDto.refreshToken).digest('hex');

    // Find valid refresh token
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token: hashedToken,
        isRevoked: false,
        expiresAt: new Date(Date.now()), // Not expired
      },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new access token
    const payload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
      role: refreshToken.user.type,
      tokenVersion: refreshToken.user.tokenVersion,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(userId: string, refreshToken?: string) {
    // Increment tokenVersion to invalidate all existing tokens
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.tokenVersion += 1;
    await this.userService.updateSimple(user.id, { tokenVersion: user.tokenVersion });

    // Revoke refresh token if provided
    if (refreshToken) {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenEntity = await this.refreshTokenRepository.findOne({
        where: { token: hashedToken, userId },
      });
      if (tokenEntity) {
        tokenEntity.isRevoked = true;
        await this.refreshTokenRepository.save(tokenEntity);
      }
    }

    return { message: 'Logout successful' };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private parseTimeToMs(time: string): number {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return parseInt(time);
    }
  }
}
