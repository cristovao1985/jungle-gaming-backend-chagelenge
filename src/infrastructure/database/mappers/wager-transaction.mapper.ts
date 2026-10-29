import { Money } from "../../../domain/money/money";
import type { CreateWagerTransactionProps } from "../../../domain/wager-transaction/create-wager-transaction-props";
import { WagerTransaction } from "../../../domain/wager-transaction/wager-transaction.entity";
import { WagerTransactionOrmEntity } from "../entities/wager-transaction-orm-entity";

export class WagerTransactionMapper {
  static toDomain(entity: WagerTransactionOrmEntity): WagerTransaction {
    const obj: CreateWagerTransactionProps = {
      id: entity.id,
      providerId: entity.providerId,
      playerId: entity.playerId,
      walletId: entity.walletId,
      externalTransactionId: entity.externalTransactionId,
      idempontencyKey: entity.idempotencyKey,
      type: entity.type,
      amount: Money.from(entity.amount),
      currency: entity.currency,
      roundId: entity.roundId,
      referenceTransactionId: entity.referenceTransactionId,
      referenceExternalTransactionId: entity.referenceExternalTransactionId,
      createdAt: entity.createdAt,
      payloadHash: entity.payloadHash,
    };

    return WagerTransaction.rehydrate({
      ...obj,
      processedAt: entity.processedAt ?? undefined,
      status: entity.status,
      failureCode: entity.failureCode,
    });
  }
  static toPersistence(
    transaction: WagerTransaction,
  ): WagerTransactionOrmEntity {
    const entity =
      new (WagerTransactionOrmEntity as new () => WagerTransactionOrmEntity)();
    entity.id = transaction.id;
    entity.providerId = transaction.providerId;
    entity.playerId = transaction.playerId;
    entity.walletId = transaction.walletId;
    entity.externalTransactionId = transaction.externalTransactionId;
    entity.idempotencyKey = transaction.idempotencyKey;
    entity.type = transaction.type;
    entity.amount = transaction.amount.toString();
    entity.currency = transaction.currency;
    entity.roundId = transaction.roundId;
    entity.referenceTransactionId = transaction.referenceTransactionId;
    entity.referenceExternalTransactionId =
      transaction.referenceExternalTransactionId;
    entity.status = transaction.status;
    entity.payloadHash = transaction.payloadHash;
    entity.createdAt = transaction.createdAt;
    entity.processedAt = transaction.processedAt;
    entity.failureCode = transaction.failureCode;
    return entity;
  }
}
