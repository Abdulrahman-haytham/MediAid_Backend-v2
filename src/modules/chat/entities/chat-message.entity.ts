import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => User, { nullable: false })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
