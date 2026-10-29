import type { CurrencyCode } from "../../enum/curreny";
import type { Money } from "../money/money";
import type { WagerTransactionType } from "./wager-transaction.type";

export interface CreateWagerTransactionProps {
  id: string;
  providerId: string;
  playerId: string;
  walletId: string;
  externalTransactionId: string;
  idempontencyKey: string;
  type: WagerTransactionType;
  amount: Money;
  currency: CurrencyCode;
  roundId?: string;
  referenceTransactionId?: string;
  referenceExternalTransactionId?: string;
  createdAt?: Date;
  payloadHash: string;
}
