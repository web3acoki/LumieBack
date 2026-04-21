import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
  ) {}

  /** List all conversations for a user (newest first, no messages) */
  async listByUser(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<{ data: ConversationEntity[]; total: number }> {
    const [data, total] = await this.conversationRepo.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }

  /** Get single conversation with messages */
  async getWithMessages(
    id: number,
    userId: number,
  ): Promise<ConversationEntity | null> {
    return this.conversationRepo.findOne({
      where: { id, userId },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } },
    });
  }

  /** Create a new conversation */
  async create(
    userId: number,
    data: { title?: string; model?: string; systemPrompt?: string },
  ): Promise<ConversationEntity> {
    return this.conversationRepo.save(
      this.conversationRepo.create({
        userId,
        title: data.title || 'New Conversation',
        model: data.model ?? null,
        systemPrompt: data.systemPrompt ?? null,
      }),
    );
  }

  /** Update conversation title/model */
  async update(
    id: number,
    userId: number,
    data: { title?: string; model?: string; systemPrompt?: string },
  ): Promise<ConversationEntity | null> {
    const conv = await this.conversationRepo.findOne({
      where: { id, userId },
    });
    if (!conv) return null;

    if (data.title !== undefined) conv.title = data.title;
    if (data.model !== undefined) conv.model = data.model;
    if (data.systemPrompt !== undefined) conv.systemPrompt = data.systemPrompt;

    return this.conversationRepo.save(conv);
  }

  /** Soft-delete conversation */
  async remove(id: number, userId: number): Promise<boolean> {
    const result = await this.conversationRepo.softDelete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  /** Add a message to a conversation */
  async addMessage(
    conversationId: number,
    userId: number,
    data: { role: string; content: string; tokens?: number },
  ): Promise<MessageEntity | null> {
    // Verify ownership
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId, userId },
    });
    if (!conv) return null;

    const msg = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        role: data.role,
        content: data.content,
        tokens: data.tokens ?? null,
      }),
    );

    // Update conversation updatedAt
    await this.conversationRepo.update(conversationId, {});

    return msg;
  }
}
