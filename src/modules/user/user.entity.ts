import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { Product } from '../product/product.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  PHARMACIST = 'pharmacist',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  type: UserRole;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  phone: string;

  @Column({ default: false })
  isVerified: boolean;

  // 👇 التعديل هنا: أضفنا type: 'varchar'
  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  verificationCode: string | null;

  @Column()
  address: string;

  // 👇 التعديل هنا: أضفنا type: 'varchar'
  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  resetPasswordToken: string | null;

  // 👇 التعديل هنا: أضفنا type: 'timestamp' (موجودة سابقاً ولكن للتأكيد)
  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  resetPasswordExpires: Date | null;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ nullable: true })
  license: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Product, { cascade: false })
  @JoinTable({ name: 'user_favorites' })
  favorites: Product[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && this.password.length < 50) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return bcrypt.compare(attempt, this.password);
  }
}
