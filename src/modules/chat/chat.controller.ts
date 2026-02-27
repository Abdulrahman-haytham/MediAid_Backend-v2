import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message in an order chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user, dto);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get messages for an order' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  getMessages(@Req() req, @Param('orderId') orderId: string) {
    return this.chatService.getMessages(orderId, req.user);
  }
}
