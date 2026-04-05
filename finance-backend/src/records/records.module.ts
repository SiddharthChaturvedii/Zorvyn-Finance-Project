import { Module } from '@nestjs/common';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { RedisService } from './redis.service';

@Module({
  controllers: [RecordsController],
  providers: [RecordsService, RedisService],
  exports: [RecordsService, RedisService],
})
export class RecordsModule {}
