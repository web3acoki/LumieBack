import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { ChatCompletionDto } from './dto/chat-completion.dto';

@Injectable()
export class AiProxyService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(private configService: ConfigService<AllConfigType>) {
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

  async chatCompletion(dto: ChatCompletionDto, userId?: number) {
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

      // Record usage (will implement later)
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

  private recordUsage(data: any) {
    // TODO: Implement database recording
    console.log('Usage recorded:', data);
  }
}
