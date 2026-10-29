import {
  UniqueConstraintViolationException,
  type EntityManager,
} from "@mikro-orm/postgresql";
import { WagerTransaction } from "../../../../domain/wager-transaction/wager-transaction.entity";
import type { WagerTransactionRepository } from "./wager-transaction.repository";
import { WagerTransactionOrmEntity } from "../../entities/wager-transaction-orm-entity";
import { WagerTransactionMapper } from "../../mappers/wager-transaction.mapper";
import { IdempotencyConflictError } from "../../../../application/ports/idempotency-conflict.error";
import {
  WagerTransactionStatus,
  type WagerTransactionType,
} from "../../../../domain/wager-transaction/wager-transaction.type";
import { ReferenceOperationConflictError } from "../../../../application/ports/reference-operation-conflict.error";

export class WagerTransactionRepositoryImpl implements WagerTransactionRepository {
  constructor(private readonly em: EntityManager) {}
  async findProcessedByReferenceAndType(
    referenceTransactionId: string,
    type: WagerTransactionType,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionOrmEntity, {
      referenceTransactionId,
      type,
      status: WagerTransactionStatus.PROCESSED,
    });

    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionOrmEntity, { id });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByIdempontencyKey(
    providerId: string,
    idempontencyKey: string,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionOrmEntity, {
      providerId,
      idempotencyKey: idempontencyKey,
    });

    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByExternalTransactionId(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionOrmEntity, {
      providerId,
      externalTransactionId,
    });

    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async save(transaction: WagerTransaction): Promise<void> {
    try {
      const entity = WagerTransactionMapper.toPersistence(transaction);

      this.em.persist(entity);
      await this.em.flush();
    } catch (error: unknown) {
      if (
        error instanceof UniqueConstraintViolationException &&
        "constraint" in error &&
        error.constraint === "uq_wager_transactions_provider_idempontency"
      ) {
        throw new IdempotencyConflictError();
      }

      if (
        error instanceof UniqueConstraintViolationException &&
        "constraint" in error &&
        (error.constraint === "uq_wager_refund_processed" ||
          error.constraint === "uq_wager_rollback_processed")
      ) {
        throw new ReferenceOperationConflictError();
      }

      throw error;
    }
  }

  async updateStatus(transaction: WagerTransaction): Promise<void> {
    try {
      const entity = await this.em.findOne(WagerTransactionOrmEntity, {
        id: transaction.id,
      });

      if (!entity) {
        throw new Error("Transação não encontrada para atualização");
      }

      entity.status = transaction.status;
      entity.processedAt = transaction.processedAt;
      entity.failureCode = transaction.failureCode ?? undefined;

      await this.em.flush();
    } catch (error: unknown) {
      if (
        error instanceof UniqueConstraintViolationException &&
        "constraint" in error &&
        (error.constraint === "uq_wager_refund_processed" ||
          error.constraint === "uq_wager_rollback_processed")
      ) {
        throw new ReferenceOperationConflictError();
      }

      throw error;
    }
  }
}
