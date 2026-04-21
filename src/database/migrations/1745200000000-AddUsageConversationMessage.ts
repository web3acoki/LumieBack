import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageConversationMessage1745200000000 implements MigrationInterface {
  name = 'AddUsageConversationMessage1745200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── usage table ──
    await queryRunner.query(`
      CREATE TABLE "usage" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "model" character varying NOT NULL,
        "endpoint" character varying NOT NULL,
        "promptTokens" integer NOT NULL DEFAULT 0,
        "completionTokens" integer NOT NULL DEFAULT 0,
        "totalTokens" integer NOT NULL DEFAULT 0,
        "cost" numeric(10,6) NOT NULL DEFAULT 0,
        "requestId" character varying,
        "status" character varying NOT NULL DEFAULT 'success',
        "durationMs" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_usage_userId" ON "usage" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_usage_createdAt" ON "usage" ("createdAt")`,
    );
    await queryRunner.query(`
      ALTER TABLE "usage"
        ADD CONSTRAINT "FK_usage_user"
        FOREIGN KEY ("userId") REFERENCES "user"("id")
        ON DELETE CASCADE
    `);

    // ── conversation table ──
    await queryRunner.query(`
      CREATE TABLE "conversation" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "title" character varying NOT NULL DEFAULT 'New Conversation',
        "model" character varying,
        "systemPrompt" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_userId" ON "conversation" ("userId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "conversation"
        ADD CONSTRAINT "FK_conversation_user"
        FOREIGN KEY ("userId") REFERENCES "user"("id")
        ON DELETE CASCADE
    `);

    // ── message table ──
    await queryRunner.query(`
      CREATE TABLE "message" (
        "id" SERIAL PRIMARY KEY,
        "conversationId" integer NOT NULL,
        "role" character varying NOT NULL,
        "content" text NOT NULL,
        "tokens" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_message_conversationId" ON "message" ("conversationId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "message"
        ADD CONSTRAINT "FK_message_conversation"
        FOREIGN KEY ("conversationId") REFERENCES "conversation"("id")
        ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_message_conversation"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_message_conversationId"`);
    await queryRunner.query(`DROP TABLE "message"`);

    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_conversation_user"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_conversation_userId"`);
    await queryRunner.query(`DROP TABLE "conversation"`);

    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_usage_user"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_usage_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_userId"`);
    await queryRunner.query(`DROP TABLE "usage"`);
  }
}
