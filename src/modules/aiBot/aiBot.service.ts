import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { lastValueFrom, timeout } from 'rxjs';

@Injectable()
export class AiBotService {
  constructor(
    @Inject('AI_BOT_RMQ_CLIENT') private readonly client: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  async chat(payload: { question: string; chat_history?: any[] }) {
    const ms =
      Number(this.configService.get('AI_BOT_TIMEOUT_MS')) > 0
        ? Number(this.configService.get('AI_BOT_TIMEOUT_MS'))
        : 15000;

    try {
      return await lastValueFrom(
        this.client.send('bot.chat', payload).pipe(timeout(ms)),
      );
    } catch (e) {
      throw new ServiceUnavailableException('AI bot service is unavailable');
    }
  }

  async rebuildIndex() {
    const ms =
      Number(this.configService.get('AI_BOT_REBUILD_TIMEOUT_MS')) > 0
        ? Number(this.configService.get('AI_BOT_REBUILD_TIMEOUT_MS'))
        : 300000;

    try {
      return await lastValueFrom(
        this.client.send('bot.rebuild_index', {}).pipe(timeout(ms)),
      );
    } catch (e) {
      throw new ServiceUnavailableException('AI bot rebuild is unavailable');
    }
  }
}

