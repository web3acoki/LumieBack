import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AiProxyService } from './ai-proxy.service';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

@ApiTags('AI Proxy')
@Controller({ path: 'ai', version: '1' })
@UseGuards(RateLimitGuard)
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'Chat completion (streaming & non-streaming)' })
  async chatCompletion(
    @Body() dto: ChatCompletionDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-agent-id') agentId?: string,
    @Headers('x-agent-name') agentName?: string,
  ) {
    const userId = req.user?.id;

    if (dto.stream) {
      // SSE streaming — we manually control the response
      await this.aiProxyService.chatCompletionStream(
        dto,
        res,
        userId,
        agentId,
        agentName,
      );
      return;
    }

    return this.aiProxyService.chatCompletion(dto, userId, agentId, agentName);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available models' })
  async getModels() {
    return this.aiProxyService.getModels();
  }
}
