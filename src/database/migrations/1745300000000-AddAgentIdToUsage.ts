import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentIdToUsage1745300000000 implements MigrationInterface {
  name = 'AddAgentIdToUsage1745300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" ADD COLUMN "agentId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD COLUMN "agentName" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_usage_agentId" ON "usage" ("agentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_usage_agentId"`);
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "agentName"`);
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "agentId"`);
  }
}
