import type { WagerTransaction } from "../../../../domain/wager-transaction/wager-transaction.entity";
import type { WagerTransactionType } from "../../../../domain/wager-transaction/wager-transaction.type";

export interface WagerTransactionRepository {
  findById(id: string): Promise<WagerTransaction | null>;

  findByIdempontencyKey(
    providerId: string,
    idempontencyKey: string,
  ): Promise<WagerTransaction | null>;

  findByExternalTransactionId(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null>;

  save(transaction: WagerTransaction): Promise<void>;
  updateStatus(transaction: WagerTransaction): Promise<void>;

  findProcessedByReferenceAndType(
    referenceTransactionId: string,
    type: WagerTransactionType,
  ): Promise<WagerTransaction | null>;
}
