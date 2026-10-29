
import type { CreateWagerTransactionProps } from "./create-wager-transaction-props";
import { Money } from "../money/money";
import { WagerTransactionType } from "./wager-transaction.type";


export function makeWagerTransactionProps(
  overrides: Partial<CreateWagerTransactionProps> = {},
): CreateWagerTransactionProps {
  return {
    id: "transaction-0001",
    providerId: "provider-001",
    playerId: "player-001",
    walletId: "wallet-001",
    externalTransactionId: "external-001",
    idempontencyKey: "idempotency-001",
    payloadHash: "hash-de-teste-001",
    type: WagerTransactionType.BET,
    amount: Money.from("100.00"),
    currency: "BRL",
    ...overrides,
  };
}
