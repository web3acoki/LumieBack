import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { MessageEntity } from './message.entity';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'conversation' })
export class ConversationEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @Index()
  user: UserEntity;

  @Column()
  userId: number;

  @Column({ type: String, default: 'New Conversation' })
  title: string;

  @Column({ type: String, nullable: true })
  model: string | null;

  @Column({ type: String, nullable: true })
  systemPrompt: string | null;

  @OneToMany(() => MessageEntity, (msg) => msg.conversation, { cascade: true })
  messages: MessageEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
