import { Migration } from '@mikro-orm/migrations';

export class Migration20261028180945 extends Migration {

  override name = 'Migration20261028180945';

  override up(): void | Promise<void> {
    this.addSql(`create table "wallets" ("id" uuid not null, "player_id" varchar(100) not null, "currency" varchar(3) not null, "balance" numeric(20,2) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "wallets" add constraint "uq_wallets_player_currency" unique ("player_id", "currency");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "wallets" cascade;`);
  }

}
