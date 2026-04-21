import { Controller, Get, HttpCode, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check — GET /api/health
   * Returns 200 if DB is reachable, 503 if not.
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        db: 'connected',
        time: new Date().toISOString(),
      };
    } catch (e) {
      this.logger.error('Health check DB query failed', e instanceof Error ? e.message : e);
      throw new HttpException(
        {
          status: 'error',
          db: 'disconnected',
          time: new Date().toISOString(),
          message: e instanceof Error ? e.message : 'Unknown DB error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
