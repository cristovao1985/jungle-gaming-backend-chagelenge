import type { TransactionContext } from "../application/ports/transaction-context"; 
import type { TransactionRunner } from "../application/ports/transaction-runner";
import type { EntityManager } from "@mikro-orm/postgresql";
import { WagerTransactionRepositoryImpl } from "../infrastructure/database/repositories/wager-transaction/wager-transaction.repository.impl";
import { WalletRepositoryImpl } from "../infrastructure/database/repositories/wallet/wallet.repository.impl";
import { LedgerEntryRepositoryImpl } from "../infrastructure/database/repositories/ledger-entry/ledger-entry.repository.impl";

export class TransactionRunnerImpl implements TransactionRunner {
  constructor(private readonly em: EntityManager) {}

  async run<T>(
    operation: (context: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.em.transactional(async (transactionalEm) => {
      const context: TransactionContext = {
        wagerTransactionRepository: new WagerTransactionRepositoryImpl(
          transactionalEm,
        ),
        walletRepository: new WalletRepositoryImpl(transactionalEm),
        ledgerEntryRepository: new LedgerEntryRepositoryImpl(transactionalEm),
      };

      return operation(context);
    });
  }
}
