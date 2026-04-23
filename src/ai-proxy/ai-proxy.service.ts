import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { UsageService, RecordUsageData } from '../usage/usage.service';
import { Response } from 'express';

@Injectable()
export class AiProxyService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(
    private configService: ConfigService<AllConfigType>,
    private usageService: UsageService,
  ) {
    this.baseUrl = this.configService.getOrThrow('aiProxy.baseUrl', {
      infer: true,
    });
    this.apiKey = this.configService.getOrThrow('aiProxy.apiKey', {
      infer: true,
    });
    this.timeout = this.configService.getOrThrow('aiProxy.timeout', {
      infer: true,
    });
  }

  async chatCompletion(
    dto: ChatCompletionDto,
    userId?: number,
    agentId?: string,
    agentName?: string,
  ) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(dto),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new HttpException(error || 'AI service error', response.status);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (userId && data.usage) {
        this.recordUsage({
          userId,
          model: dto.model,
          endpoint: 'chat/completions',
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          requestId: data.id,
          status: 'success',
          durationMs: duration,
          agentId,
          agentName,
        });
      }

      return data;
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        throw new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
      }
      throw error;
    }
  }

  /**
   * Streaming chat completion — pipes SSE from upstream (Shenma) to client.
   */
  async chatCompletionStream(
    dto: ChatCompletionDto,
    res: Response,
    userId?: number,
    agentId?: string,
    agentName?: string,
  ) {
    const startTime = Date.now();

    try {
      const upstream = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ ...dto, stream: true }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!upstream.ok) {
        const error = await upstream.json().catch(() => ({}));
        res
          .status(upstream.status)
          .json(error || { error: 'AI service error' });
        return;
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const body = upstream.body;
      if (!body) {
        res.end();
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);

          // Try to extract usage from final chunk
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.usage) {
                  totalPromptTokens = parsed.usage.prompt_tokens || 0;
                  totalCompletionTokens = parsed.usage.completion_tokens || 0;
                }
              } catch {
                // Not valid JSON, skip
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      res.end();

      // Record usage after stream completes
      if (userId && (totalPromptTokens || totalCompletionTokens)) {
        this.recordUsage({
          userId,
          model: dto.model,
          endpoint: 'chat/completions',
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens,
          requestId: 'stream-' + Date.now(),
          status: 'success',
          durationMs: Date.now() - startTime,
          agentId,
          agentName,
        });
      }
    } catch (error: any) {
      if (!res.headersSent) {
        if (error.name === 'TimeoutError') {
          res.status(408).json({ error: 'Request timeout' });
        } else {
          res.status(502).json({ error: 'AI service unavailable' });
        }
      } else {
        res.end();
      }
    }
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new HttpException('Failed to fetch models', response.status);
      }

      return await response.json();
    } catch {
      throw new HttpException(
        'AI service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private recordUsage(data: RecordUsageData) {
    // Fire-and-forget — don't block the response
    this.usageService.record(data).catch((err) => {
      console.error('Failed to record usage:', err);
    });
  }
}
