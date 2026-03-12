import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  // --- Registration Logic ---
  async register(createUserDto: CreateUserDto): Promise<User> {
    const { email, username, type, license, location } = createUserDto;

    if (type === UserRole.PHARMACIST && !license) {
      throw new BadRequestException('Pharmacists must provide a license');
    }

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      throw new ConflictException('Email or Username already in use');
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

    const newUser = this.userRepository.create({
      ...createUserDto,
      latitude: location?.coordinates[0] || 0,
      longitude: location?.coordinates[1] || 0,
      verificationCode,
    });

    await this.userRepository.save(newUser);

    // Send Email
    await this.mailService.sendVerificationEmail(email, verificationCode);

    return newUser;
  }

  // --- Create Admin Logic ---
  async createAdmin(
    createUserDto: CreateUserDto,
    secretKey: string,
  ): Promise<User> {
    this.logger.warn(
      `Admin creation attempt for email=${createUserDto.email ?? 'unknown'}`,
    );
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Admin bootstrap endpoint is disabled in production',
      );
    }
    if (secretKey !== process.env.SECRET_KEY_ADMIN) {
      this.logger.warn('Admin creation failed due to invalid secret key');
      throw new ForbiddenException('Invalid Secret Key');
    }
    createUserDto.type = UserRole.ADMIN;
    const admin = await this.register(createUserDto);
    this.logger.log(`Admin created successfully with id=${admin.id}`);
    return admin;
  }

  // --- Email Verification ---
  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email, verificationCode: code },
    });
    if (!user) throw new BadRequestException('Invalid code or email');

    user.isVerified = true;
    user.verificationCode = null;
    await this.userRepository.save(user);
  }

  // --- Finders ---
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User not found`);
    return user;
  }

  // 🔥 دالة مهمة جداً لموديول Auth 🔥
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  // --- Update ---
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<User> {
    if (currentUser.id !== id && currentUser.type !== UserRole.ADMIN) {
      throw new ForbiddenException('Unauthorized action');
    }

    const user = await this.findOne(id);

    if (updateUserDto.location) {
      if (updateUserDto.location?.coordinates) {
        user.latitude = updateUserDto.location.coordinates[0];
        user.longitude = updateUserDto.location.coordinates[1];
      }
      delete updateUserDto.location;
    }

    if (updateUserDto.password) {
      user.password = updateUserDto.password;
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  // --- Delete ---
  async remove(id: string, currentUser: User): Promise<void> {
    if (currentUser.id !== id && currentUser.type !== UserRole.ADMIN) {
      throw new ForbiddenException('Unauthorized action');
    }
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`User not found`);
  }

  // --- Password Reset ---
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) return;

    const resetCode = crypto.randomInt(100000, 999999).toString();
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);

    await this.userRepository.save(user);

    // Send Email
    await this.mailService.sendPasswordResetEmail(email, resetCode);
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.resetPasswordToken = :token', { token: hashedToken })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();

    if (!user) throw new BadRequestException('Invalid or expired token');

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);
  }
}
