import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AiBotController } from './aiBot.controller';
import { AiBotService } from './aiBot.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'AI_BOT_RMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const url =
            configService.get<string>('AI_BOT_RMQ_URL') ||
            'amqp://guest:guest@localhost:5672/';
          const queue = configService.get<string>('AI_BOT_RMQ_QUEUE') || 'bot.rpc';

          return {
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
  ],
  controllers: [AiBotController],
  providers: [AiBotService],
  exports: [AiBotService],
})
export class AiBotModule {}

