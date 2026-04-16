import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiProxyController],
  providers: [AiProxyService],
  exports: [AiProxyService],
})
export class AiProxyModule {}
