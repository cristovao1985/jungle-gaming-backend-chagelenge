import { Inject } from "@nestjs/common";
import type { CreateLedgerEntryProps } from "../../domain/ledger-entry/create-leader-entry.props";
import { Money } from "../../domain/money/money";
import type { CreateWagerTransactionProps } from "../../domain/wager-transaction/create-wager-transaction-props";
import { WagerTransaction } from "../../domain/wager-transaction/wager-transaction.entity";
import { WagerTransactionType } from "../../domain/wager-transaction/wager-transaction.type";
import type { CurrencyCode } from "../../enum/curreny";
import { IdempotencyConflictError } from "../ports/idempotency-conflict.error";
import { TRANSACTION_RUNNER } from "../ports/transaction-runner.token";
import type { TransactionRunner } from "../ports/transaction-runner";
import { randomUUID } from "node:crypto";
import { LedgerEntry } from "../../domain/ledger-entry/ledger-entry.entity";
import { LedgerEntryDirection } from "../../domain/ledger-entry/ledger-entry-direction";
import { LedgerDirection } from "../../domain/wager-transaction/ledger-direction.type";
import { FailureErrors } from "../../enum/errors";
import { ReferenceOperationConflictError } from "../ports/reference-operation-conflict.error";
import { WalletConcurrencyConflictError } from "../ports/wallet-conflict.error";

export interface ProcessWagerTransactionInput {
  id: string;
  providerId: string;
  playerId: string;
  walletId: string;
  externalTransactionId: string;
  idempontencyKey: string;
  type: WagerTransactionType;
  amount: string;
  currency: CurrencyCode;
  roundId?: string;
  referenceExternalTransactionId?: string;
  payloadHash: string;
}

export class ProcessWagerTransaction {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(
    input: ProcessWagerTransactionInput,
  ): Promise<WagerTransaction> {
    try {
      return await this.transactionRunner.run(async (context) => {
        const existingTransaction =
          await context.wagerTransactionRepository.findByIdempontencyKey(
            input.providerId,
            input.idempontencyKey,
          );

        if (existingTransaction) {
          if (
            !existingTransaction.payloadHashAlreadyExists(input.payloadHash)
          ) {
            throw new Error(
              "A chave de idempotência já foi utilizada em outra transação.",
            );
          }

          return existingTransaction;
        }

        const wallet = await context.walletRepository.findById(input.walletId);

        if (!wallet) {
          throw new Error("Carteira não encontrada");
        }

        if (
          wallet.playerId !== input.playerId ||
          wallet.currency !== input.currency
        ) {
          throw new Error("Carteira incompatível com a transação");
        }

        let referenceTransaction: WagerTransaction | null = null;

        if (
          input.type === WagerTransactionType.REFUND ||
          input.type === WagerTransactionType.ROLLBACK
        ) {
          if (!input.referenceExternalTransactionId) {
            throw new Error("Transação de referência é obrigatória");
          }

          referenceTransaction =
            await context.wagerTransactionRepository.findByExternalTransactionId(
              input.providerId,
              input.referenceExternalTransactionId,
            );

          if (!referenceTransaction) {
            throw new Error("Transação de referência não encontrada");
          }
        }

        const props: CreateWagerTransactionProps = {
          id: input.id,
          providerId: input.providerId,
          playerId: input.playerId,
          walletId: input.walletId,
          externalTransactionId: input.externalTransactionId,
          idempontencyKey: input.idempontencyKey,
          type: input.type,
          amount: Money.from(input.amount),
          currency: input.currency,
          roundId: input.roundId,
          referenceExternalTransactionId: input.referenceExternalTransactionId,
          payloadHash: input.payloadHash,
          referenceTransactionId: referenceTransaction?.id,
        };

        const transaction = WagerTransaction.create(props);

        if (
          referenceTransaction &&
          (input.type === WagerTransactionType.REFUND ||
            input.type === WagerTransactionType.ROLLBACK)
        ) {
          const existingReferenceOperation =
            await context.wagerTransactionRepository.findProcessedByReferenceAndType(
              referenceTransaction.id,
              input.type,
            );

          if (existingReferenceOperation) {
            transaction.markTransactionAsRejected(
              FailureErrors.WAGER_TRANSACTION_CONFLICT,
            );

            await context.wagerTransactionRepository.save(transaction);

            return transaction;
          }
        }

        const direction = transaction.ledgerDirection(
          referenceTransaction?.type,
        );

        await context.wagerTransactionRepository.save(transaction);

        if (direction !== LedgerDirection.NONE) {
          const expectedVersion = wallet.version;

          if (direction === LedgerDirection.DEBIT) {
            try {
              wallet.debit(transaction.amount);
            } catch (error: unknown) {
              if (
                !(error instanceof Error) ||
                error.message !== "Saldo insuficiente"
              ) {
                throw error;
              }

              transaction.markTransactionAsRejected(
                FailureErrors.INSUFFICIENT_FUNDS,
              );

              await context.wagerTransactionRepository.updateStatus(
                transaction,
              );

              return transaction;
            }
          } else {
            wallet.credit(transaction.amount);
          }

          await context.walletRepository.save(wallet, expectedVersion);

          const ledgerEntry = LedgerEntry.create({
            id: randomUUID(),
            walletId: wallet.id,
            wagerTransactionId: transaction.id,
            direction:
              direction === LedgerDirection.DEBIT
                ? LedgerEntryDirection.DEBIT
                : LedgerEntryDirection.CREDIT,
            amount: transaction.amount,
            currency: transaction.currency,
          });

          await context.ledgerEntryRepository.save(ledgerEntry);
        }

        transaction.markTransactionAsProcessed();

        await context.wagerTransactionRepository.updateStatus(transaction);

        return transaction;
      });
    } catch (error: unknown) {
      if (
        error instanceof WalletConcurrencyConflictError &&
        input.type === WagerTransactionType.BET
      ) {
        return this.recoverBetConcurrencyConflict(input);
      }
      
      if (error instanceof WalletConcurrencyConflictError) {
        const isReferenceOperation =
          input.type === WagerTransactionType.REFUND ||
          input.type === WagerTransactionType.ROLLBACK;

        if (!isReferenceOperation || !input.referenceExternalTransactionId) {
          throw error;
        }

        const referenceOperationExists = await this.transactionRunner.run(
          async (context) => {
            const referenceTransaction =
              await context.wagerTransactionRepository.findByExternalTransactionId(
                input.providerId,
                input.referenceExternalTransactionId!,
              );

            if (!referenceTransaction) {
              return false;
            }

            const existingOperation =
              await context.wagerTransactionRepository.findProcessedByReferenceAndType(
                referenceTransaction.id,
                input.type,
              );

            return existingOperation !== null;
          },
        );

        if (!referenceOperationExists) {
          throw error;
        }

        error = new ReferenceOperationConflictError();
      }

      if (error instanceof ReferenceOperationConflictError) {
        return await this.transactionRunner.run(async (ctx) => {
          const existingTransaction =
            await ctx.wagerTransactionRepository.findByIdempontencyKey(
              input.providerId,
              input.idempontencyKey,
            );

          if (existingTransaction) {
            if (
              !existingTransaction.payloadHashAlreadyExists(input.payloadHash)
            ) {
              throw new Error(
                "A chave de idempotência já foi utilizada em outra transação",
              );
            }

            return existingTransaction;
          }

          const referenceTransaction =
            await ctx.wagerTransactionRepository.findByExternalTransactionId(
              input.providerId,
              input.referenceExternalTransactionId!,
            );
          if (!referenceTransaction) {
            throw new Error(
              "Transação de referência não encontrada ao registrar o conflito.",
            );
          }

          const rejectedTransaction = WagerTransaction.create({
            id: input.id,
            providerId: input.providerId,
            playerId: input.playerId,
            walletId: input.walletId,
            externalTransactionId: input.externalTransactionId,
            idempontencyKey: input.idempontencyKey,
            type: input.type,
            amount: Money.from(input.amount),
            currency: input.currency,
            roundId: input.roundId,
            referenceExternalTransactionId:
              input.referenceExternalTransactionId,
            referenceTransactionId: referenceTransaction.id,
            payloadHash: input.payloadHash,
          });

          rejectedTransaction.markTransactionAsRejected(
            FailureErrors.WAGER_TRANSACTION_CONFLICT,
          );

          await ctx.wagerTransactionRepository.save(rejectedTransaction);
          return rejectedTransaction;
        });
      }

      if (!(error instanceof IdempotencyConflictError)) {
        throw error;
      }

      const concurrentTransaction = await this.transactionRunner.run(
        async (context) =>
          context.wagerTransactionRepository.findByIdempontencyKey(
            input.providerId,
            input.idempontencyKey,
          ),
      );

      if (!concurrentTransaction) {
        throw error;
      }

      if (!concurrentTransaction.payloadHashAlreadyExists(input.payloadHash)) {
        throw new Error(
          "A chave de idempotência já foi utilizada em outra transação.",
        );
      }

      return concurrentTransaction;
    }
  }

  private async recoverBetConcurrencyConflict(
    input: ProcessWagerTransactionInput,
  ): Promise<WagerTransaction> {
    return this.transactionRunner.run(async (context) => {
      const existingTransaction =
        await context.wagerTransactionRepository.findByIdempontencyKey(
          input.providerId,
          input.idempontencyKey,
        );

      if (existingTransaction) {
        if (!existingTransaction.payloadHashAlreadyExists(input.payloadHash)) {
          throw new Error(
            "A chave de idempotência já foi utilizada em outra transação.",
          );
        }

        return existingTransaction;
      }

      const wallet = await context.walletRepository.findById(input.walletId);

      if (!wallet) {
        throw new Error("Carteira não encontrada");
      }

      if (
        wallet.playerId !== input.playerId ||
        wallet.currency !== input.currency
      ) {
        throw new Error("Carteira incompatível com a transação");
      }

      const transaction = WagerTransaction.create({
        id: input.id,
        providerId: input.providerId,
        playerId: input.playerId,
        walletId: input.walletId,
        externalTransactionId: input.externalTransactionId,
        idempontencyKey: input.idempontencyKey,
        type: input.type,
        amount: Money.from(input.amount),
        currency: input.currency,
        roundId: input.roundId,
        payloadHash: input.payloadHash,
      });

      if (wallet.balance.lessThan(transaction.amount)) {
        transaction.markTransactionAsRejected(FailureErrors.INSUFFICIENT_FUNDS);

        await context.wagerTransactionRepository.save(transaction);

        return transaction;
      }

      throw new WalletConcurrencyConflictError();
    });
  }
}
