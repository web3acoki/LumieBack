import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  Headers,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AiProxyService } from './ai-proxy.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

@ApiTags('AI Proxy')
@Controller({ path: 'ai', version: '1' })
@UseGuards(RateLimitGuard)
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  /**
   * Chat completion endpoint — passthrough to upstream AI provider.
   *
   * IMPORTANT: We use @UsePipes() with empty args to DISABLE the global
   * ValidationPipe for this endpoint. The global pipe has whitelist:true
   * which strips unknown fields (tools, tool_choice, metadata, etc.)
   * that OpenClaw agent sends. We need to forward the ENTIRE request
   * body to the upstream provider as-is.
   */
  @Post('chat/completions')
  @ApiOperation({ summary: 'Chat completion (streaming & non-streaming)' })
  @UsePipes()
  async chatCompletion(
    @Body() body: any,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-agent-id') agentId?: string,
    @Headers('x-agent-name') agentName?: string,
  ) {
    const userId = req.user?.id;

    if (body.stream) {
      await this.aiProxyService.chatCompletionStream(
        body,
        res,
        userId,
        agentId,
        agentName,
      );
      return;
    }

    return this.aiProxyService.chatCompletion(body, userId, agentId, agentName);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available models' })
  async getModels() {
    return this.aiProxyService.getModels();
  }
}
