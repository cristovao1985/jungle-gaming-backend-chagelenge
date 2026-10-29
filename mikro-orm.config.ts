import { defineConfig } from "@mikro-orm/postgresql";
import { WagerTransactionOrmEntity } from "./src/infrastructure/database/entities/wager-transaction-orm-entity";
import { WalletOrmEntity } from "./src/infrastructure/database/entities/wallet-orm.entity";
import { LedgerEntryOrmEntity } from "./src/infrastructure/database/entities/ledger-entry-orm.entity";

export default defineConfig({  
  host: Bun.env.DB_HOST,
  port: Number(Bun.env.DB_PORT),
  dbName: Bun.env.DB_NAME,
  user: Bun.env.DB_USER,
  password: Bun.env.DB_PASSWORD,
  entities: [WagerTransactionOrmEntity, WalletOrmEntity, LedgerEntryOrmEntity],
  entitiesTs: [WagerTransactionOrmEntity, WalletOrmEntity, LedgerEntryOrmEntity],

  migrations: {
    path: "./src/database/migrations",
    pathTs: "./src/database/migrations",
    tableName: "mikro_orm_migrations",
    transactional: true,
    allOrNothing: true,
  },
});
