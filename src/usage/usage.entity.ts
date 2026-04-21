import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { EntityRelationalHelper } from '../utils/relational-entity-helper';

@Entity({ name: 'usage' })
export class UsageEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @Index()
  user: UserEntity;

  @Column()
  userId: number;

  @Column({ type: String })
  model: string;

  @Column({ type: String })
  endpoint: string;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: number;

  @Column({ type: String, nullable: true })
  requestId: string | null;

  @Column({ type: String, default: 'success' })
  status: string;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
