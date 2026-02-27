import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/user.entity';

export enum KafuPostType {
  MEDICINE_PAYMENT = 'Medicine Payment',
  MEDICINE_DELIVERY = 'Medicine Delivery',
}

export enum KafuPostStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

@Entity('kafu_posts')
export class KafuPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, eager: true })
  user: User;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 1000 })
  description: string;

  @Column({
    type: 'enum',
    enum: KafuPostType,
  })
  type: KafuPostType;

  @Column({ nullable: true })
  medicineName: string;

  @Column({ nullable: true })
  pharmacyName: string;

  @Column()
  areaName: string;

  @Column({
    type: 'enum',
    enum: KafuPostStatus,
    default: KafuPostStatus.OPEN,
  })
  status: KafuPostStatus;

  @ManyToOne(() => User, { nullable: true, eager: true })
  helper: User;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
