import { Migration } from "@mikro-orm/migrations";

export class Migration20261029180901 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE UNIQUE INDEX "uq_wager_refund_processed"
      ON "wager_transactions" ("reference_transaction_id")
      WHERE "type" = 'REFUND'
        AND "status" = 'PROCESSED'
        AND "reference_transaction_id" IS NOT NULL;
    `);

    this.addSql(`
      CREATE UNIQUE INDEX "uq_wager_rollback_processed"
      ON "wager_transactions" ("reference_transaction_id")
      WHERE "type" = 'ROLLBACK'
        AND "status" = 'PROCESSED'
        AND "reference_transaction_id" IS NOT NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "uq_wager_rollback_processed";
    `);

    this.addSql(`
      DROP INDEX IF EXISTS "uq_wager_refund_processed";
    `);
  }
}
