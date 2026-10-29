import { Migration } from '@mikro-orm/migrations';

export class Migration20261028202239 extends Migration {

  override name = 'Migration20261028202239';

  override up(): void | Promise<void> {
    this.addSql(`create table "ledger_entries" ("id" uuid not null, "wallet_id" uuid not null, "wager_transaction_id" uuid not null, "direction" varchar(255) not null, "amount" numeric(20,2) not null, "currency" varchar(3) not null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "ledger_entries" add constraint "uq_ledger_entries_wager_transaction" unique ("wager_transaction_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "ledger_entries" cascade;`);
  }

}
