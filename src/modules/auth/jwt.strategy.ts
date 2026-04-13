import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // يقرأ التوكن من الهيدر
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // payload.sub هو الـ ID الخاص بالمستخدم (وضعناه عند تسجيل الدخول)
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    
    // Check if token version matches (for token revocation support)
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }
    
    // هذا الكائن سيتم تخزينه في req.user
    return user;
  }
}
