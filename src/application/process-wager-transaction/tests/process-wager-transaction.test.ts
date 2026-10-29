import { describe, expect, mock, test } from "bun:test";
import {
  WagerTransactionStatus,
  WagerTransactionType,
} from "../../../domain/wager-transaction/wager-transaction.type";
import type { CurrencyCode } from "../../../enum/curreny";
import {
  ProcessWagerTransaction,
  type ProcessWagerTransactionInput,
} from "../process-wager-transaction";
import { WagerTransaction } from "../../../domain/wager-transaction/wager-transaction.entity";
import type { CreateWagerTransactionProps } from "../../../domain/wager-transaction/create-wager-transaction-props";
import { Money } from "../../../domain/money/money";
import type { WagerTransactionRepository } from "../../../infrastructure/database/repositories/wager-transaction/wager-transaction.repository";
import { IdempotencyConflictError } from "../../ports/idempotency-conflict.error";
import type { TransactionRunner } from "../../ports/transaction-runner";
import type { TransactionContext } from "../../ports/transaction-context";
import type { WalletRepository } from "../../../infrastructure/database/repositories/wallet/wallet.repository";
import type { LedgerEntryRepository } from "../../../infrastructure/database/repositories/ledger-entry/ledger-entry.repository";
import { Wallet } from "../../../domain/wallet/wallet.entity";
import { ReferenceOperationConflictError } from "../../ports/reference-operation-conflict.error";
import { FailureErrors } from "../../../enum/errors";
import { WalletConcurrencyConflictError } from "../../ports/wallet-conflict.error";

function makeInput(
  overrides: Partial<ProcessWagerTransactionInput> = {},
): ProcessWagerTransactionInput {
  return {
    id: "transaction-1",
    providerId: "provider-1",
    playerId: "player-1",
    walletId: "wallet-1",
    externalTransactionId: "external-1",
    idempontencyKey: "idempotency-1",
    type: WagerTransactionType.BET,
    amount: "10.00",
    currency: "BRL" as CurrencyCode,
    payloadHash: "hash-1",
    ...overrides,
  };
}

function makeRepository(): WagerTransactionRepository {
  return {
    findById: mock(async () => null),
    findByIdempontencyKey: mock(async () => null),
    findByExternalTransactionId: mock(async () => null),
    save: mock(async () => {}),
    updateStatus: mock(async () => {}),
    findProcessedByReferenceAndType: mock(async () => null),
  };
}

function makeContext(
  wagerTransactionRepository: WagerTransactionRepository,
): TransactionContext {
  const walletRepository: WalletRepository = {
    findById: mock(async () =>
      Wallet.create(
        "wallet-1",
        "player-1",
        "BRL" as CurrencyCode,
        Money.from("100.00"),
      ),
    ),
    findByPlayerIdAndCurrency: mock(async () => null),
    save: mock(async () => {}),
  };

  const ledgerEntryRepository: LedgerEntryRepository = {
    findByWagerTransactionId: mock(async () => null),
    findByWalletId: mock(async () => ({ entries: [], nextCursor: null })),
    save: mock(async () => {}),
  };

  return {
    wagerTransactionRepository,
    walletRepository,
    ledgerEntryRepository,
  };
}

function makeTransactionRunner(
  repository: WagerTransactionRepository,
  contextOverride?: TransactionContext,
): TransactionRunner {
  const context = contextOverride ?? makeContext(repository);

  return {
    async run<T>(
      operation: (context: TransactionContext) => Promise<T>,
    ): Promise<T> {
      return operation(context);
    },
  };
}

function makeExistingTransaction(
  input: ProcessWagerTransactionInput,
): WagerTransaction {
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
  };

  return WagerTransaction.create(props);
}

describe("Process Wager Transaction", () => {
  test("cria e persiste uma nova transacao", async () => {
    const repository = makeRepository();
    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );
    const input = makeInput();

    const result = await useCase.execute(input);
    expect(result).toBeInstanceOf(WagerTransaction);
    expect(result.id).toBe(input.id);
    expect(result.amount.equals(Money.from(input.amount))).toBe(true);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  test("retorna a transacao existente sem salva-la novamente", async () => {
    const input = makeInput();
    const existing = makeExistingTransaction(input);
    const repository = makeRepository();

    repository.findByIdempontencyKey = mock(async () => existing);

    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );
    const result = await useCase.execute(input);

    expect(result).toBe(existing);
    expect(repository.save).toHaveBeenCalledTimes(0);
  });

  test("rejeita reutilizazao da chave com outro payload", async () => {
    const input = makeInput();
    const existing = makeExistingTransaction(input);
    const repository = makeRepository();
    repository.findByIdempontencyKey = mock(async () => existing);

    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );

    await expect(
      useCase.execute(
        makeInput({
          payloadHash: "diferent-hash",
        }),
      ),
    ).rejects.toThrow(
      "A chave de idempotência já foi utilizada em outra transação.",
    );
    expect(repository.save).toHaveBeenCalledTimes(0);
  });

  test("propaga o erro se a persistência falhar", async () => {
    const repository = makeRepository();

    repository.save = mock(async () => {
      throw new Error("Falha no banco");
    });

    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );

    await expect(useCase.execute(makeInput())).rejects.toThrow(
      "Falha no banco",
    );
  });

  test("recupera a transacao existente quando ocorre conflito concorrente com o mesmo payload", async () => {
    const input = makeInput();
    const existing = makeExistingTransaction(input);
    const repository = makeRepository();

    repository.save = mock(async () => {
      throw new IdempotencyConflictError();
    });

    let findCalls = 0;
    repository.findByIdempontencyKey = mock(async () => {
      // A primeira consulta não encontra registro.
      // A segunda encontra a transação criada pela requisição concorrente.
      findCalls += 1;

      return findCalls >= 2 ? existing : null;
    });

    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );
    const result = await useCase.execute(input);

    expect(result).toBe(existing);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.findByIdempontencyKey).toHaveBeenCalledTimes(2);
  });

  test("rejeita conflito concorrente quando o payload é diferente", async () => {
    const input = makeInput();
    const existing = makeExistingTransaction(input);
    const repository = makeRepository();

    repository.save = mock(async () => {
      throw new IdempotencyConflictError();
    });

    let findCalls = 0;
    repository.findByIdempontencyKey = mock(async () => {
      findCalls += 1;

      return findCalls >= 2 ? existing : null;
    });

    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );

    await expect(
      useCase.execute(
        makeInput({
          payloadHash: "different-hash",
        }),
      ),
    ).rejects.toThrow(
      "A chave de idempotência já foi utilizada em outra transação.",
    );

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.findByIdempontencyKey).toHaveBeenCalledTimes(2);
  });

  test("registra como rejeitada uma operação que perde o conflito de referência", async () => {
    const input = makeInput({
      id: "refund-loser",
      externalTransactionId: "refund-external-loser",
      idempontencyKey: "refund-idempotency-loser",
      type: WagerTransactionType.REFUND,
      amount: "10.00",
      referenceExternalTransactionId: "bet-external-1",
    });

    const reference = WagerTransaction.create({
      id: "bet-reference-1",
      providerId: input.providerId,
      playerId: input.playerId,
      walletId: input.walletId,
      externalTransactionId: "bet-external-1",
      idempontencyKey: "bet-idempotency-1",
      type: WagerTransactionType.BET,
      amount: Money.from("10.00"),
      currency: input.currency,
      payloadHash: "bet-hash-1",
    });

    reference.markTransactionAsProcessed();

    const repository = makeRepository();

    repository.findByExternalTransactionId = mock(async () => reference);

    repository.updateStatus = mock(async (transaction: WagerTransaction) => {
      if (transaction.status === WagerTransactionStatus.PROCESSED) {
        throw new ReferenceOperationConflictError();
      }
    });

    const useCase = new ProcessWagerTransaction(
      makeTransactionRunner(repository),
    );

    const result = await useCase.execute(input);

    expect(result.status).toBe(WagerTransactionStatus.REJECTED);
    expect(result.failureCode).toBe(FailureErrors.WAGER_TRANSACTION_CONFLICT);
  });

  test("propaga o conflito de concorrência de uma aposta BET", async () => {
    const repository = makeRepository();

    const context = makeContext(repository);
    context.walletRepository.save = mock(async () => {
      throw new WalletConcurrencyConflictError();
    });

    const runner: TransactionRunner = {
      async run<T>(
        operation: (context: TransactionContext) => Promise<T>,
      ): Promise<T> {
        return operation(context);
      },
    };

    // Simula o conflito no salvamento da carteira.
    const originalMakeContext = makeContext;
    void originalMakeContext;

    const useCase = new ProcessWagerTransaction({
      run: async <T>(
        operation: (context: TransactionContext) => Promise<T>,
      ): Promise<T> => {
        return operation(context);
      },
    });

    await expect(useCase.execute(makeInput())).rejects.toBeInstanceOf(
      WalletConcurrencyConflictError,
    );
  });

  test("rejeita aposta com saldo insuficiente após conflito de concorrência", async () => {
    const input = makeInput({ amount: "70.00" });
    const repository = makeRepository();
    const context = makeContext(repository);

    let walletReads = 0;

    context.walletRepository.findById = mock(async () => {
      walletReads += 1;

      return Wallet.create(
        "wallet-1",
        "player-1",
        "BRL" as CurrencyCode,
        Money.from(walletReads === 1 ? "100.00" : "40.00"),
      );
    });

    context.walletRepository.save = mock(async () => {
      throw new WalletConcurrencyConflictError();
    });

    const runner = makeTransactionRunner(repository, context);
    const useCase = new ProcessWagerTransaction(runner);

    const result = await useCase.execute(input);

    expect(result.status).toBe(WagerTransactionStatus.REJECTED);
    expect(result.failureCode).toBe(FailureErrors.INSUFFICIENT_FUNDS);
    expect(walletReads).toBe(2);
    expect(context.walletRepository.save).toHaveBeenCalledTimes(1);
    expect(context.ledgerEntryRepository.save).toHaveBeenCalledTimes(0);
  });
});
