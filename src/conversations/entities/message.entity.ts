import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'message' })
export class MessageEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ConversationEntity, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @Index()
  conversation: ConversationEntity;

  @Column()
  conversationId: number;

  @Column({ type: String })
  role: string; // 'system' | 'user' | 'assistant'

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', nullable: true })
  tokens: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
