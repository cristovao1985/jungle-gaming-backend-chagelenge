import { Migration } from '@mikro-orm/migrations';

export class Migration20261028133027 extends Migration {

  override name = 'Migration20261028133027';

  override up(): void | Promise<void> {
    this.addSql(`create table "wager_transactions" ("id" uuid not null, "provider_id" varchar(100) not null, "player_id" varchar(100) not null, "wallet_id" varchar(100) not null, "external_transaction_id" varchar(150) not null, "idempotency_key" varchar(150) not null, "type" text not null, "amount" numeric(20,2) not null, "currency" varchar(3) not null, "round_id" varchar(150) null, "reference_transaction_id" varchar(150) null, "reference_external_transaction_id" varchar(150) null, "status" text not null, "payload_hash" varchar(128) not null, "created_at" timestamptz not null, "processed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "ix_wager_transactions_reference" on "wager_transactions" ("provider_id", "reference_external_transaction_id");`);
    this.addSql(`alter table "wager_transactions" add constraint "uq_wager_transactions_provider_external_id" unique ("provider_id", "external_transaction_id");`);
    this.addSql(`alter table "wager_transactions" add constraint "uq_wager_transactions_provider_idempontency" unique ("provider_id", "idempotency_key");`);

    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_type_check" check ("type" in ('OPENING', 'BET', 'WIN', 'LOSS', 'REFUND', 'ROLLBACK'));`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_status_check" check ("status" in ('PENDING', 'PENDING_REFERENCE', 'PROCESSED', 'REJECTED', 'FAILED'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "wager_transactions" cascade;`);
  }

}
