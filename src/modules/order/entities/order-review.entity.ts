import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { User } from '../../user/user.entity';
import { Pharmacy } from '../../pharmacy/pharmacy.entity';

@Entity('order_reviews')
@Index('idx_order_review_order', ['order'])
@Index('idx_order_review_pharmacy', ['pharmacy'])
export class OrderReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Order, { nullable: false })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @ManyToOne(() => Pharmacy, { nullable: false })
  pharmacy: Pharmacy;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
