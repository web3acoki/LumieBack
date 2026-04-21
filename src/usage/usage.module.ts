import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageEntity } from './usage.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageEntity])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
