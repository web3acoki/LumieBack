import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageEntity } from './usage.entity';

export interface RecordUsageData {
  userId: number;
  model: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestId?: string;
  status: string;
  durationMs: number;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageEntity)
    private readonly usageRepository: Repository<UsageEntity>,
  ) {}

  async record(data: RecordUsageData): Promise<void> {
    await this.usageRepository.save(
      this.usageRepository.create({
        userId: data.userId,
        model: data.model,
        endpoint: data.endpoint,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        cost: 0, // TODO: calculate based on model pricing
        requestId: data.requestId ?? null,
        status: data.status,
        durationMs: data.durationMs,
      }),
    );
  }

  async getUserUsage(
    userId: number,
    since?: Date,
  ): Promise<{
    totalTokens: number;
    totalRequests: number;
    totalCost: number;
  }> {
    const qb = this.usageRepository
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u.totalTokens), 0)', 'totalTokens')
      .addSelect('COUNT(u.id)', 'totalRequests')
      .addSelect('COALESCE(SUM(u.cost), 0)', 'totalCost')
      .where('u.userId = :userId', { userId });

    if (since) {
      qb.andWhere('u.createdAt >= :since', { since });
    }

    const result = await qb.getRawOne();
    return {
      totalTokens: parseInt(result.totalTokens, 10),
      totalRequests: parseInt(result.totalRequests, 10),
      totalCost: parseFloat(result.totalCost),
    };
  }
}
