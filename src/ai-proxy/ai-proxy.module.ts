import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [ConfigModule, UsageModule],
  controllers: [AiProxyController],
  providers: [AiProxyService],
  exports: [AiProxyService],
})
export class AiProxyModule {}
