import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EmergencyOrderService } from '../../modules/emergencyOrder/services/emergencyOrder.service';

@Injectable()
export class OrderTimeoutJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderTimeoutJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly emergencyOrderService: EmergencyOrderService) {}

  onModuleInit() {
    this.timer = setInterval(async () => {
      this.logger.log('Checking for timed out emergency orders...');
      try {
        await this.emergencyOrderService.processOrderTimeouts();
      } catch (err: any) {
        this.logger.error(
          `Error during scheduled order timeout check: ${err?.message}`,
        );
      }
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
