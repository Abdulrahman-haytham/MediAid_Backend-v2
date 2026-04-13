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
    let retries = 2;
    let lastError: Error | null = null;

    while (retries >= 0) {
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
        return; // Success, exit function
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Failed to send verification email to ${email} (attempt ${2 - retries}/3)`,
          lastError.stack,
        );
        retries--;
        if (retries >= 0) {
          // Wait 2 seconds before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries failed - throw error to prevent registration
    this.logger.error(
      `Failed to send verification email to ${email} after 3 attempts`,
      lastError?.stack,
    );
    throw new Error(`Failed to send verification email: ${lastError?.message}`);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    let retries = 2;
    let lastError: Error | null = null;

    while (retries >= 0) {
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
        return; // Success, exit function
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Failed to send password reset email to ${email} (attempt ${2 - retries}/3)`,
          lastError.stack,
        );
        retries--;
        if (retries >= 0) {
          // Wait 2 seconds before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries failed - throw error
    this.logger.error(
      `Failed to send password reset email to ${email} after 3 attempts`,
      lastError?.stack,
    );
    throw new Error(`Failed to send password reset email: ${lastError?.message}`);
  }
}
