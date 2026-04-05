import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RecordsModule } from '../records/records.module';

@Module({
  imports: [RecordsModule], // For RedisService
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
