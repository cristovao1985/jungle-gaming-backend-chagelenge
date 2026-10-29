import { Module } from "@nestjs/common";
import { WALLET_REPOSITORY } from "../../../../application/ports/wallet.repository.token";
import { EntityManager } from "@mikro-orm/postgresql";
import { WalletRepositoryImpl } from "./wallet.repository.impl";

@Module({
  providers: [
    {
      provide: WALLET_REPOSITORY,
      useFactory: (em: EntityManager) => new WalletRepositoryImpl(em),
      inject: [EntityManager],
    },
  ],
  exports: [WALLET_REPOSITORY],
})
export class WalletRepositoryModule {}
