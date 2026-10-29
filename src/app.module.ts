import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ProcessWagerTransaction } from "./application/process-wager-transaction/process-wager-transaction";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import mikroOrmConfig from "../mikro-orm.config";
import { WagerTransactionRepositoryModule } from "./infrastructure/database/repositories/wager-transaction/wager-transaction.repository.module";
import { WalletRepositoryModule } from "./infrastructure/database/repositories/wallet/wallet.repository.module";
import { LedgerEntryRepositoryModule } from "./infrastructure/database/repositories/ledger-entry/ledger-entry.repository.module";
import { TRANSACTION_RUNNER } from "./application/ports/transaction-runner.token";
import { EntityManager } from "@mikro-orm/postgresql";
import { TransactionRunnerImpl } from "./database/transaction-runner.impl";
import { OpenWallet } from "./application/open-wallet/open-wallet";
import { WalletController } from "./presentation/controllers/wallet.controller";
import { GetWallet } from "./application/get-wallet/get-wallet";
import { GetWalletLedger } from "./application/get-wallet-ledger/get-wallet-ledger";
import { WageringController } from "./presentation/controllers/wagering.controller";

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    WagerTransactionRepositoryModule,
    WalletRepositoryModule,
    LedgerEntryRepositoryModule,
  ],
  controllers: [AppController, WalletController, WageringController],
  providers: [
    ProcessWagerTransaction,
    OpenWallet,
    GetWallet,
    GetWalletLedger,
    {
      provide: TRANSACTION_RUNNER,
      useFactory: (em) => new TransactionRunnerImpl(em),
      inject: [EntityManager],
    },
  ],
})
export class AppModule {}
