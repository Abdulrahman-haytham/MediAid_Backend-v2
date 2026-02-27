import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
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

    // 4. تجهيز التوكن
    const payload = { sub: user.id, email: user.email, role: user.type };

    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
      },
    };
  }
}
