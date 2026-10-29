import type { LedgerEntryRepository } from "../../infrastructure/database/repositories/ledger-entry/ledger-entry.repository";
import type { WagerTransactionRepository } from "../../infrastructure/database/repositories/wager-transaction/wager-transaction.repository";
import type { WalletRepository } from "../../infrastructure/database/repositories/wallet/wallet.repository";


export interface TransactionContext {
  wagerTransactionRepository: WagerTransactionRepository;
  walletRepository: WalletRepository;
  ledgerEntryRepository: LedgerEntryRepository;
}
