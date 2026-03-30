import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../user/user.entity';
import { Order } from '../order/entities/order.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepo: Repository<ChatMessage>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async assertUserCanAccessOrder(userId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'pharmacy', 'pharmacy.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isCustomer = order.user.id === userId;
    const isPharmacist = order.pharmacy.user.id === userId;

    if (!isCustomer && !isPharmacist) {
      throw new ForbiddenException(
        'You are not authorized to access this order chat',
      );
    }
  }

  async create(userId: string, dto: CreateMessageDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['user', 'pharmacy', 'pharmacy.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isCustomer = order.user.id === userId;
    const isPharmacist = order.pharmacy.user.id === userId;

    if (!isCustomer && !isPharmacist) {
      throw new ForbiddenException(
        'You are not authorized to send messages in this order',
      );
    }

    const message = this.chatRepo.create({
      order,
      sender: { id: userId } as User,
      content: dto.content,
      imageUrl: dto.imageUrl ?? null,
    });

    return await this.chatRepo.save(message);
  }

  async sendMessage(user: User, dto: SendMessageDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['user', 'pharmacy', 'pharmacy.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user is part of the order (Customer or Pharmacist)
    const isCustomer = order.user.id === user.id;
    const isPharmacist = order.pharmacy.user.id === user.id;

    if (!isCustomer && !isPharmacist) {
      throw new ForbiddenException(
        'You are not authorized to send messages in this order',
      );
    }

    const message = this.chatRepo.create({
      order,
      sender: user,
      content: dto.content,
    });

    return await this.chatRepo.save(message);
  }

  async getMessages(orderId: string, user: User) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'pharmacy', 'pharmacy.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access
    const isCustomer = order.user.id === user.id;
    const isPharmacist = order.pharmacy.user.id === user.id;

    if (!isCustomer && !isPharmacist) {
      throw new ForbiddenException(
        'You are not authorized to view messages for this order',
      );
    }

    return await this.chatRepo.find({
      where: { order: { id: orderId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }
}
