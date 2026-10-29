import { Module } from "@nestjs/common";
import { WAGER_TRANSACTION_REPOSITORY } from "../../../../application/ports/wager-transaction.token";
import { WagerTransactionRepositoryImpl } from "./wager-transaction.repository.impl";
import { EntityManager } from "@mikro-orm/postgresql";
//import { getEntityManagerToken } from "@mikro-orm/nestjs";

@Module({
  providers: [
    {
      provide: WAGER_TRANSACTION_REPOSITORY,
      useFactory: (em: EntityManager) =>
        new WagerTransactionRepositoryImpl(em),
      inject: [EntityManager],
    },
  ],
  exports: [WAGER_TRANSACTION_REPOSITORY],
})
export class WagerTransactionRepositoryModule {}
