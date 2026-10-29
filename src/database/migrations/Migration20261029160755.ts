import { Migration } from '@mikro-orm/migrations';

export class Migration20261029160755 extends Migration {

  override name = 'Migration20261029160755';

  override up(): void | Promise<void> {
    this.addSql(`alter table "wager_transactions" add "failure_code" varchar(100) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "wager_transactions" drop column "failure_code";`);
  }

}
