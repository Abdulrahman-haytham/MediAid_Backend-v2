import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { validate as uuidValidate } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      client.data.user = payload;

      // Join a room based on user ID to receive personal notifications
      client.join(`user_${payload.sub}`);
      console.log(`Client connected: ${client.id}, User: ${payload.sub}`);
    } catch (error) {
      console.error('Connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    const user = client.data.user;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.chatService.create(user.sub, createMessageDto);

      // Notify the recipient (Pharmacy or User)
      // The orderId maps to: order_{orderId}
      this.server
        .to(`order_${createMessageDto.orderId}`)
        .emit('newMessage', message);

      return message;
    } catch (err: any) {
      return { error: err?.message ?? 'Failed to send message' };
    }
  }

  @SubscribeMessage('joinOrderRoom')
  async handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const { orderId } = data ?? {};
    if (!orderId || !uuidValidate(orderId)) {
      return { error: 'Invalid orderId' };
    }

    await this.chatService.assertUserCanAccessOrder(user.sub, orderId);
    client.join(`order_${orderId}`);

    return { event: 'joinedOrderRoom', orderId };
  }

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    return undefined;
  }
}
