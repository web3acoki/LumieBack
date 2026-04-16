import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiProxyService } from './ai-proxy.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

@ApiTags('AI Proxy')
@Controller({ path: 'ai', version: '1' })
@UseGuards(RateLimitGuard)
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'Chat completion (non-streaming)' })
  async chatCompletion(@Body() dto: ChatCompletionDto, @Request() req) {
    const userId = req.user?.id;
    return this.aiProxyService.chatCompletion(dto, userId);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available models' })
  async getModels() {
    return this.aiProxyService.getModels();
  }
}
