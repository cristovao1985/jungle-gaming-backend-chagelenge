import type { LedgerEntry } from "../../../../domain/ledger-entry/ledger-entry.entity";

export interface LedgerEntryRepository {
  findByWagerTransactionId(
    wagerTransactionId: string,
  ): Promise<LedgerEntry | null>;
  
  findByWalletId(walletId:string, options:{ cursor?:string, limit:number}):Promise<{entries: LedgerEntry[],nextCursor: string | null}>

  save(entry: LedgerEntry): Promise<void>;
}
