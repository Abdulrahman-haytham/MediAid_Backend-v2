import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { User } from '../../user/user.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  order: Order;

  @OneToMany(() => ChatMessage, message => message.chat, { cascade: true })
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chat, chat => chat.messages, { onDelete: 'CASCADE', nullable: false })
  chat: Chat;

  @ManyToOne(() => User, { nullable: false, eager: true })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
