import { Module } from "@nestjs/common";
import { LEDGER_ENTRY_REPOSITORY } from "../../../../application/ports/ledger-entry.repository.token";
import { EntityManager } from "@mikro-orm/postgresql";
import { LedgerEntryRepositoryImpl } from "./ledger-entry.repository.impl";

@Module({
  providers: [
    {
      provide: LEDGER_ENTRY_REPOSITORY,
      useFactory: (em: EntityManager) => new LedgerEntryRepositoryImpl(em),
      inject: [EntityManager],
    },
  ],
  exports: [LEDGER_ENTRY_REPOSITORY],
})
export class LedgerEntryRepositoryModule {}
