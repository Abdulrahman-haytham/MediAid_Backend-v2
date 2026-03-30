import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  order: Order;

  // chat_messages يتم ربطها بـ order مباشرةً (بدون علاقة chat-foreign-key)،
  // لذا نستخدم رسالة.order كـ inverse side.
  @OneToMany(() => ChatMessage, (message) => message.order, { cascade: true })
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
