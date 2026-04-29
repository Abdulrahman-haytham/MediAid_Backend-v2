import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiBotChatDto } from './dto/ai-bot-chat.dto';
import { AiBotService } from './aiBot.service';

@ApiTags('AI Bot')
@Controller('ai')
export class AiBotController {
  constructor(private readonly aiBotService: AiBotService) {}

  @ApiOperation({
    summary: 'AI medical chat (RAG)',
    description:
      'Routes the request to the Python bot worker via RabbitMQ (RPC) and returns answer + citations.',
  })
  @Post('chat')
  async chat(@Body() dto: AiBotChatDto) {
    const result = await this.aiBotService.chat({
      question: dto.question,
      chat_history: dto.chat_history ?? [],
    });
    return { message: 'OK', result };
  }

  @ApiOperation({
    summary: 'Rebuild bot index',
    description: 'Triggers rebuilding the FAISS index inside the Python bot worker via RabbitMQ.',
  })
  @Post('rebuild-index')
  async rebuildIndex() {
    const result = await this.aiBotService.rebuildIndex();
    return { message: 'OK', result };
  }
}

