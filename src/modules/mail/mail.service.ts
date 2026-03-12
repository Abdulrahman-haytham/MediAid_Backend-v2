import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: `"MediAid Support" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'MediAid Email Verification',
        text: `Welcome to MediAid! Your verification code is: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to MediAid!</h2>
            <p>Please use the following code to verify your email address:</p>
            <h1 style="color: #4CAF50; letter-spacing: 5px;">${code}</h1>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        'Error sending verification email',
        error instanceof Error ? error.stack : String(error),
      );
      // We don't throw here to avoid blocking registration if email fails,
      // but in production you might want to handle this differently.
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    try {
      await this.transporter.sendMail({
        from: `"MediAid Support" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'MediAid Password Reset Request',
        text: `You requested a password reset. Use this token: ${token}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Please use the following token:</p>
            <div style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace;">
              ${token}
            </div>
            <p>This token expires in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        'Error sending password reset email',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
