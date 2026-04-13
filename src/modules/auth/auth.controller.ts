import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserService } from '../user/user.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @ApiOperation({ summary: 'Login user and return JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Verify user email using verification code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code or email' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.userService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.verificationCode,
    );
  }

  @ApiOperation({ summary: 'Request password reset (sends token to email)' })
  @ApiResponse({ status: 201, description: 'Reset email sent if user exists' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('request-password-reset')
  async requestReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.userService.requestPasswordReset(requestPasswordResetDto.email);
  }

  @ApiOperation({ summary: 'Reset password using valid token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.userService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @ApiOperation({ summary: 'Logout user and revoke token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: any, @Body('refreshToken') refreshToken?: string) {
    return this.authService.logout(req.user.id, refreshToken);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @Throttle({ default: { limit: 3, ttl: 300 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }
}
