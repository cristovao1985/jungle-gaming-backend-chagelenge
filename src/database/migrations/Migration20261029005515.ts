import { Migration } from '@mikro-orm/migrations';

export class Migration20261029005515 extends Migration {

  override name = 'Migration20261029005515';

  override up(): void | Promise<void> {
    this.addSql(`alter table "wager_transactions" alter column "wallet_id" type uuid using ("wallet_id"::text::uuid);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "wager_transactions" alter column "wallet_id" type text using ("wallet_id"::text);`);

    this.addSql(`alter table "wager_transactions" alter column "wallet_id" type varchar(100) using ("wallet_id"::varchar(100));`);
  }

}
