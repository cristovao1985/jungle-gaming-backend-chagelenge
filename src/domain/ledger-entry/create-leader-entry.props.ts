import type { CurrencyCode } from "../../enum/curreny";
import type { Money } from "../money/money";
import type { LedgerEntryDirection } from "./ledger-entry-direction";

export interface CreateLedgerEntryProps {
  id: string;  
  walletId: string;
  wagerTransactionId: string;
  direction: LedgerEntryDirection;
  amount: Money;
  currency: CurrencyCode;
  createdAt?: Date;
}
