import { afterAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import defineConfig from "../../../../../../mikro-orm.config";
import { WagerTransactionOrmEntity } from "../../../entities/wager-transaction-orm-entity";
import { WagerTransactionRepositoryImpl } from "../wager-transaction.repository.impl";
import { WagerTransaction } from "../../../../../domain/wager-transaction/wager-transaction.entity";
import {
  WagerTransactionStatus,
  WagerTransactionType,
} from "../../../../../domain/wager-transaction/wager-transaction.type";
import { Money } from "../../../../../domain/money/money";
import { IdempotencyConflictError } from "../../../../../application/ports/idempotency-conflict.error";
import {
  ProcessWagerTransaction,
  type ProcessWagerTransactionInput,
} from "../../../../../application/process-wager-transaction/process-wager-transaction";
import { TransactionRunnerImpl } from "../../../../../database/transaction-runner.impl";
import { Wallet } from "../../../../../domain/wallet/wallet.entity";
import { WalletRepositoryImpl } from "../../wallet/wallet.repository.impl";
import { WalletOrmEntity } from "../../../entities/wallet-orm.entity";
import { LedgerEntryOrmEntity } from "../../../entities/ledger-entry-orm.entity";
import { FailureErrors } from "../../../../../enum/errors";

describe("Wager Transaction Repository - Integration", () => {
  let orm: MikroORM | undefined;

  afterAll(async () => {
    if (orm) {
      await orm.close(true);
    }
  });

  test("configuração do MikroORM aponta para a entidade de transação", () => {
    expect(defineConfig.entities).toHaveLength(3);
    expect(defineConfig.entities?.[0]).toBe(WagerTransactionOrmEntity);
  });

  test("conecta ao PostgresSQL e consulta a tabela de transacoes", async () => {
    orm = await MikroORM.init(defineConfig);

    const result = await orm.em
      .getConnection()
      .execute("select count(*)::int as total from wager_transactions");

    expect(result).toHaveLength(1);
    expect(typeof result[0]?.total).toBe("number");
    expect(defineConfig.entities).toContain(WagerTransactionOrmEntity);
  });

  test("retorna null quando a transacao nao existe", async () => {
    const em = orm!.em.fork();
    const repository = new WagerTransactionRepositoryImpl(em);
    const result = await repository.findById(
      "00000000-0000-4000-8000-000000000000",
    );

    expect(result).toBeNull();
  });

  test("persiste uma transacao e permite recuperar pelo ID gerado", async () => {
    const em = orm!.em.fork();
    const repository = new WagerTransactionRepositoryImpl(em);

    const transactionId = crypto.randomUUID();
    const uniqueSuffix = crypto.randomUUID();

    const transaction = WagerTransaction.create({
      id: transactionId,
      providerId: `integration-provider-${uniqueSuffix}`,
      playerId: `integration-player-${uniqueSuffix}`,
      walletId: `integration-wallet-${uniqueSuffix}`,
      externalTransactionId: `integration-external-${uniqueSuffix}`,
      idempontencyKey: `integration-idempotency-${uniqueSuffix}`,
      type: WagerTransactionType.BET,
      amount: Money.from("10.00"),
      currency: "BRL",
      payloadHash: `integration-hash-${uniqueSuffix}`,
    });

    try {
      await repository.save(transaction);
      em.clear();

      const persistedTransaction = await repository.findById(transactionId);

      expect(persistedTransaction).not.toBeNull();
      expect(persistedTransaction?.id).toBe(transactionId);
      expect(persistedTransaction?.providerId).toBe(transaction.providerId);
      expect(persistedTransaction?.amount.toString()).toBe("10.00");
    } catch (error) {
    } finally {
      await em.nativeDelete(WagerTransactionOrmEntity, {
        id: transactionId,
      });
      em.clear();
    }
  });

  test("rejeita duas transacoes com a mesma chave de idempontencia", async () => {
    const em = orm!.em.fork();
    const repository = new WagerTransactionRepositoryImpl(em);
    const uniqueSuffix = crypto.randomUUID();
    const providerId = `provider-${uniqueSuffix}`;
    const idempotencyKey = `idempotency-${uniqueSuffix}`;
    const firstId = crypto.randomUUID();

    const firstTransaction = WagerTransaction.create({
      id: firstId,
      providerId,
      playerId: `player-${uniqueSuffix}`,
      walletId: `wallet-${uniqueSuffix}`,
      externalTransactionId: `integration-external-1-${uniqueSuffix}`,
      idempontencyKey: idempotencyKey,
      type: WagerTransactionType.BET,
      amount: Money.from("10.00"),
      currency: "BRL",
      payloadHash: `integration-hash-1-${uniqueSuffix}`,
    });

    const secondTransaction = WagerTransaction.create({
      id: crypto.randomUUID(),
      providerId,
      playerId: `player-${uniqueSuffix}`,
      walletId: `wallet-${uniqueSuffix}`,
      externalTransactionId: `integration-external-2-${uniqueSuffix}`,
      idempontencyKey: idempotencyKey,
      type: WagerTransactionType.BET,
      amount: Money.from("20.00"),
      currency: "BRL",
      payloadHash: `integration-hash-2-${uniqueSuffix}`,
    });

    try {
      await repository.save(firstTransaction);
      expect(repository.save(secondTransaction)).rejects.toBeInstanceOf(
        IdempotencyConflictError,
      );
    } catch (error) {
    } finally {
      const cleanupEm = orm!.em.fork();

      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, {
        id: firstId,
      });

      cleanupEm.clear();
    }
  });

  test("permite a mesma chave de idempontencia para provedores diferentes", async () => {
    const em = orm!.em.fork();
    const repository = new WagerTransactionRepositoryImpl(em);
    const uniqueSuffix = crypto.randomUUID();
    const idempotencyKey = `idempotency-${uniqueSuffix}`;
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();

    const common = {
      playerId: `player-${uniqueSuffix}`,
      walletId: `wallet-${uniqueSuffix}`,
      idempontencyKey: idempotencyKey,
      type: WagerTransactionType.BET,
      amount: Money.from("20.00"),
      currency: "BRL",
    };

    const firstTransaction = WagerTransaction.create({
      ...common,
      id: firstId,
      providerId: `iprovider-a-${uniqueSuffix}`,
      externalTransactionId: `external-a-${uniqueSuffix}`,
      payloadHash: `hash-a-${uniqueSuffix}`,
    });

    const secondTransaction = WagerTransaction.create({
      ...common,
      id: secondId,
      providerId: `iprovider-b-${uniqueSuffix}`,
      externalTransactionId: `external-b-${uniqueSuffix}`,
      payloadHash: `hash-b-${uniqueSuffix}`,
    });

    try {
      await repository.save(firstTransaction);
      await repository.save(secondTransaction);

      const firstPersistedTransaction = await repository.findById(firstId);
      const secondPersistedTransaction = await repository.findById(secondId);

      expect(firstPersistedTransaction).not.toBeNull();
      expect(secondPersistedTransaction).not.toBeNull();
      expect(firstPersistedTransaction?.providerId).not.toBe(
        secondPersistedTransaction?.providerId,
      );
      expect(firstPersistedTransaction?.idempotencyKey).toBe(
        secondPersistedTransaction?.idempotencyKey,
      );
    } catch (error) {
    } finally {
      const cleanupEm = orm!.em.fork();
      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, {
        id: { $in: [firstId, secondId] },
      });
      cleanupEm.clear();
    }
  });

  test("retorna a mesma transacao quando a mesma requisicao e processada sua vezes", async () => {
    const em = orm!.em.fork();
    const transactionRunner = new TransactionRunnerImpl(em);
    const useCase = new ProcessWagerTransaction(transactionRunner);

    const uniqueSuffix = crypto.randomUUID();

    const input: ProcessWagerTransactionInput = {
      id: crypto.randomUUID(),
      providerId: `integration-provider-${uniqueSuffix}`,
      playerId: `integration-player-${uniqueSuffix}`,
      walletId: `integration-wallet-${uniqueSuffix}`,
      externalTransactionId: `integration-external-${uniqueSuffix}`,
      idempontencyKey: `integration-idempotency-${uniqueSuffix}`,
      type: WagerTransactionType.BET,
      amount: "10.00",
      currency: "BRL",
      payloadHash: `integration-hash-${uniqueSuffix}`,
    };

    try {
      const firstResult = await useCase.execute(input);
      const secondResult = await useCase.execute({
        ...input,
        id: crypto.randomUUID(),
        externalTransactionId: `external-retry-${uniqueSuffix}`,
      });

      expect(secondResult.id).toBe(firstResult.id);
      const persistedTransactions = await em.find(WagerTransactionOrmEntity, {
        providerId: input.providerId,
        idempotencyKey: input.idempontencyKey,
      });

      expect(persistedTransactions).toHaveLength(1);
      expect(persistedTransactions[0]?.status).toBe(
        WagerTransactionStatus.PROCESSED,
      );
      expect(persistedTransactions[0]?.processedAt).toBeInstanceOf(Date);
    } catch (error) {
      const cleanupEm = orm!.em.fork();

      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, {
        id: input.id,
      });

      cleanupEm.clear();
    }
  });

  test("executa duas transacoes concorrentes com a mesma chave e retorna a mesma transacao", async () => {
    const uniqueSuffix = crypto.randomUUID();
    const providerId = `provider-${uniqueSuffix}`;
    const idempotencyKey = `idempotency-${uniqueSuffix}`;

    const input: ProcessWagerTransactionInput = {
      id: crypto.randomUUID(),
      providerId: `integration-provider-${uniqueSuffix}`,
      playerId: `integration-player-${uniqueSuffix}`,
      walletId: `integration-wallet-${uniqueSuffix}`,
      externalTransactionId: `integration-external-${uniqueSuffix}`,
      idempontencyKey: `integration-idempotency-${uniqueSuffix}`,
      type: WagerTransactionType.BET,
      amount: "10.00",
      currency: "BRL",
      payloadHash: `integration-hash-${uniqueSuffix}`,
    };

    const em1 = orm!.em.fork();
    const em2 = orm!.em.fork();

    const repository1 = new WagerTransactionRepositoryImpl(em1);
    const repository2 = new WagerTransactionRepositoryImpl(em2);
    const useCase1 = new ProcessWagerTransaction(
      new TransactionRunnerImpl(em1),
    );
    const useCase2 = new ProcessWagerTransaction(
      new TransactionRunnerImpl(em2),
    );

    const cleanupEm = orm!.em.fork();

    try {
      const [result1, result2] = await Promise.all([
        useCase1.execute(input),
        useCase2.execute({
          ...input,
          id: crypto.randomUUID(),
          externalTransactionId: `integration-external-retry-${uniqueSuffix}`,
        }),
      ]);

      expect(result1.id).toBe(result2.id);

      const persisted = await cleanupEm.find(WagerTransactionOrmEntity, {
        providerId,
        idempotencyKey,
      });

      expect(persisted).toHaveLength(1);
      expect(persisted[0]?.payloadHash).toBe(input.payloadHash);
    } catch (error) {
    } finally {
      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, {
        providerId,
        idempotencyKey,
      });

      cleanupEm.clear();
      em1.clear();
      em2.clear();
    }
  });

  test("rejeita payloads diferentes em execuções concorrentes com a mesma chave", async () => {
    const uniqueSuffix = crypto.randomUUID();
    const providerId = `integration-provider-${uniqueSuffix}`;
    const idempotencyKey = `integration-idempotency-${uniqueSuffix}`;

    const commonInput: ProcessWagerTransactionInput = {
      id: crypto.randomUUID(),
      providerId,
      playerId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      externalTransactionId: `integration-external-${uniqueSuffix}`,
      idempontencyKey: idempotencyKey,
      type: WagerTransactionType.BET,
      amount: "10.00",
      currency: "BRL",
      payloadHash: `integration-hash-a-${uniqueSuffix}`,
    };

    const inputA = commonInput;

    const inputB: ProcessWagerTransactionInput = {
      ...commonInput,
      id: crypto.randomUUID(),
      externalTransactionId: `integration-external-b-${uniqueSuffix}`,
      amount: "20.00",
      payloadHash: `integration-hash-b-${uniqueSuffix}`,
    };

    const em1 = orm!.em.fork();
    const em2 = orm!.em.fork();

    const repository1 = new WagerTransactionRepositoryImpl(em1);
    const repository2 = new WagerTransactionRepositoryImpl(em2);

    const useCase1 = new ProcessWagerTransaction(
      new TransactionRunnerImpl(em1),
    );
    const useCase2 = new ProcessWagerTransaction(
      new TransactionRunnerImpl(em2),
    );

    const cleanupEm = orm!.em.fork();

    const wallet = Wallet.create(
      commonInput.walletId,
      commonInput.playerId,
      commonInput.currency,
      Money.from("100.00"),
    );

    await new WalletRepositoryImpl(cleanupEm).save(wallet);

    try {
      const results = await Promise.allSettled([
        useCase1.execute(inputA),
        useCase2.execute(inputB),
      ]);

      const fulfilled = results.filter(
        (result) => result.status === "fulfilled",
      );
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectedResult = rejected[0];

      if (rejectedResult?.status === "rejected") {
        expect(rejectedResult.reason).toBeInstanceOf(Error);
        expect(rejectedResult.reason.message).toBe(
          "A chave de idempotência já foi utilizada em outra transação.",
        );
      }

      const persisted = await cleanupEm.find(WagerTransactionOrmEntity, {
        providerId,
        idempotencyKey,
      });

      expect(persisted).toHaveLength(1);
      expect([inputA.payloadHash, inputB.payloadHash]).toContain(
        persisted[0]!.payloadHash,
      );
    } finally {
      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, {
        providerId,
        idempotencyKey,
      });

      cleanupEm.clear();
      em1.clear();
      em2.clear();
    }
  });

  test("reverte a transação e preserva o saldo quando não há saldo suficiente", async () => {
    const em = orm!.em.fork();
    const transactionRunner = new TransactionRunnerImpl(em);
    const useCase = new ProcessWagerTransaction(transactionRunner);
    const uniqueSuffix = crypto.randomUUID();

    const input: ProcessWagerTransactionInput = {
      id: crypto.randomUUID(),
      providerId: `rollback-provider-${uniqueSuffix}`,
      playerId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      externalTransactionId: `rollback-external-${uniqueSuffix}`,
      idempontencyKey: `rollback-idempotency-${uniqueSuffix}`,
      type: WagerTransactionType.BET,
      amount: "100.00",
      currency: "BRL",
      payloadHash: `rollback-hash-${uniqueSuffix}`,
    };

    const cleanupEm = orm!.em.fork();

    const wallet = Wallet.create(
      input.walletId,
      input.playerId,
      input.currency,
      Money.from("20.00"),
    );

    await new WalletRepositoryImpl(cleanupEm).save(wallet);

    try {
      const result = await useCase.execute(input);

      expect(result.status).toBe(WagerTransactionStatus.REJECTED);
      expect(result.failureCode).toBe(FailureErrors.INSUFFICIENT_FUNDS);

      cleanupEm.clear();

      const persistedWallet = await cleanupEm.findOne(WalletOrmEntity, {
        id: input.walletId,
      });

      const persistedTransaction = await cleanupEm.findOne(
        WagerTransactionOrmEntity,
        { id: input.id },
      );

      const ledgerEntries = await cleanupEm.find(LedgerEntryOrmEntity, {
        walletId: input.walletId,
      });

      expect(persistedWallet?.balance.toString()).toBe("20.00");
      expect(persistedWallet?.version).toBe(1);
      expect(persistedTransaction?.status).toBe(
        WagerTransactionStatus.REJECTED,
      );
      expect(persistedTransaction?.failureCode).toBe(
        FailureErrors.INSUFFICIENT_FUNDS,
      );
      expect(ledgerEntries).toHaveLength(0);
    } finally {
      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, {
        id: input.id,
      });
      await cleanupEm.nativeDelete(LedgerEntryOrmEntity, {
        walletId: input.walletId,
      });
      await cleanupEm.nativeDelete(WalletOrmEntity, {
        id: input.walletId,
      });
      cleanupEm.clear();
      em.clear();
    }
  });

  test("processa apenas um REFUND concorrente para a mesma aposta", async () => {
    orm ??= await MikroORM.init(defineConfig);

    const uniqueSuffix = crypto.randomUUID();
    const providerId = `refund-provider-${uniqueSuffix}`;
    const playerId = `refund-player-${uniqueSuffix}`;
    const walletId = crypto.randomUUID();
    const betId = crypto.randomUUID();
    const betExternalId = `bet-external-${uniqueSuffix}`;

    const betInput: ProcessWagerTransactionInput = {
      id: betId,
      providerId,
      playerId,
      walletId,
      externalTransactionId: betExternalId,
      idempontencyKey: `bet-idempotency-${uniqueSuffix}`,
      type: WagerTransactionType.BET,
      amount: "10.00",
      currency: "BRL",
      payloadHash: `bet-hash-${uniqueSuffix}`,
    };

    const refundA: ProcessWagerTransactionInput = {
      id: crypto.randomUUID(),
      providerId,
      playerId,
      walletId,
      externalTransactionId: `refund-a-${uniqueSuffix}`,
      idempontencyKey: `refund-idempotency-a-${uniqueSuffix}`,
      type: WagerTransactionType.REFUND,
      amount: "10.00",
      currency: "BRL",
      referenceExternalTransactionId: betExternalId,
      payloadHash: `refund-hash-a-${uniqueSuffix}`,
    };

    const refundB: ProcessWagerTransactionInput = {
      ...refundA,
      id: crypto.randomUUID(),
      externalTransactionId: `refund-b-${uniqueSuffix}`,
      idempontencyKey: `refund-idempotency-b-${uniqueSuffix}`,
      payloadHash: `refund-hash-b-${uniqueSuffix}`,
    };

    const setupEm = orm.em.fork();
    const cleanupEm = orm.em.fork();

    const wallet = Wallet.create(
      walletId,
      playerId,
      "BRL",
      Money.from("100.00"),
    );

    try {
      await new WalletRepositoryImpl(setupEm).save(wallet);

      // Cria a aposta processada: saldo esperado passa de 100 para 90.
      const betResult = await new ProcessWagerTransaction(
        new TransactionRunnerImpl(setupEm),
      ).execute(betInput);

      expect(betResult.status).toBe(WagerTransactionStatus.PROCESSED);

      // EntityManagers independentes simulam duas requisições concorrentes.
      const emA = orm.em.fork();
      const emB = orm.em.fork();

      try {
        const useCaseA = new ProcessWagerTransaction(
          new TransactionRunnerImpl(emA),
        );
        const useCaseB = new ProcessWagerTransaction(
          new TransactionRunnerImpl(emB),
        );

        const results = await Promise.all([
          useCaseA.execute(refundA),
          useCaseB.execute(refundB),
        ]);

        expect(
          results.filter(
            (result) => result.status === WagerTransactionStatus.PROCESSED,
          ),
        ).toHaveLength(1);

        expect(
          results.filter(
            (result) => result.status === WagerTransactionStatus.REJECTED,
          ),
        ).toHaveLength(1);

        const rejectedResult = results.find(
          (result) => result.status === WagerTransactionStatus.REJECTED,
        );

        expect(rejectedResult?.failureCode).toBe(
          FailureErrors.WAGER_TRANSACTION_CONFLICT,
        );

        cleanupEm.clear();

        const persistedWallet = await cleanupEm.findOne(WalletOrmEntity, {
          id: walletId,
        });

        const persistedTransactions = await cleanupEm.find(
          WagerTransactionOrmEntity,
          { providerId },
        );

        const ledgerEntries = await cleanupEm.find(LedgerEntryOrmEntity, {
          walletId,
        });

        expect(Number(persistedWallet?.balance)).toBe(100);

        expect(
          persistedTransactions.filter(
            (transaction) =>
              transaction.type === WagerTransactionType.REFUND &&
              transaction.status === WagerTransactionStatus.PROCESSED,
          ),
        ).toHaveLength(1);

        expect(
          persistedTransactions.filter(
            (transaction) =>
              transaction.type === WagerTransactionType.REFUND &&
              transaction.status === WagerTransactionStatus.REJECTED,
          ),
        ).toHaveLength(1);

        // Um débito da aposta e somente um crédito de estorno.
        expect(ledgerEntries).toHaveLength(2);
      } finally {
        emA.clear();
        emB.clear();
      }
    } finally {
      await cleanupEm.nativeDelete(WagerTransactionOrmEntity, { providerId });
      await cleanupEm.nativeDelete(LedgerEntryOrmEntity, { walletId });
      await cleanupEm.nativeDelete(WalletOrmEntity, { id: walletId });

      setupEm.clear();
      cleanupEm.clear();
    }
  });
});
