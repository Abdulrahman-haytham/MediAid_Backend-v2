import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @ApiOperation({ summary: 'Health check' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'All services healthy' })
  @ApiResponse({ status: 503, description: 'Service unhealthy' })
  @HealthCheck()
  @Get('health')
  healthCheck() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
