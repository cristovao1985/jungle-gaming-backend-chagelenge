import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import defineConfig from "../../../../../../mikro-orm.config";
import { WalletOrmEntity } from "../../../entities/wallet-orm.entity";
import { WalletRepositoryImpl } from "../wallet.repository.impl";
import { Wallet } from "../../../../../domain/wallet/wallet.entity";
import { Money } from "../../../../../domain/money/money";
import { WalletConcurrencyConflictError } from "../../../../../application/ports/wallet-conflict.error";

describe("Wallet Repository - Integration", () => {
  let orm: MikroORM | undefined;
  beforeAll(async () => {
    orm = await MikroORM.init(defineConfig);
  });

  afterAll(async () => {
    if (orm) {
      await orm.close(true);
    }
  });

  test("MikroORM registra a entidade da carteira", () => {
    expect(defineConfig.entities).toHaveLength(3);
    expect(defineConfig.entities?.[1]).toBe(WalletOrmEntity);
  });

  test("persiste uma carteira e recupera pelo ID", async () => {
    const em = orm!.em.fork();
    const repository = new WalletRepositoryImpl(em);
    const id = crypto.randomUUID();
    const playerId = `integration-player-${crypto.randomUUID()}`;

    try {
      const wallet = Wallet.create(id, playerId, "BRL", Money.from("100.00"));

      await repository.save(wallet);
      em.clear();

      const persisted = await repository.findById(id);

      expect(persisted).not.toBeNull();
      expect(persisted?.id).toBe(id);
      expect(persisted?.playerId).toBe(playerId);
      expect(persisted?.currency).toBe("BRL");
      expect(persisted?.balance.toString()).toBe("100.00");
      expect(persisted?.version).toBe(1);
    } finally {
      await em.nativeDelete(WalletOrmEntity, { id });
      em.clear();
    }
  });

  test("busca carteira por jogador e moeda", async () => {
    const em = orm!.em.fork();
    const repository = new WalletRepositoryImpl(em);
    const id = crypto.randomUUID();
    const playerId = `integration-player-${crypto.randomUUID()}`;

    try {
      await repository.save(
        Wallet.create(id, playerId, "BRL", Money.from("50.00")),
      );

      em.clear();

      const persisted = await repository.findByPlayerIdAndCurrency(
        playerId,
        "BRL",
      );

      expect(persisted).not.toBeNull();
      expect(persisted?.id).toBe(id);
      expect(persisted?.balance.toString()).toBe("50.00");
    } finally {
      await em.nativeDelete(WalletOrmEntity, { id });
      em.clear();
    }
  });

  test("persiste a atualização do saldo e da versão", async () => {
    const em = orm!.em.fork();
    const repository = new WalletRepositoryImpl(em);
    const id = crypto.randomUUID();
    const playerId = `integration-player-${crypto.randomUUID()}`;

    try {
      const wallet = Wallet.create(id, playerId, "BRL", Money.from("100.00"));

      await repository.save(wallet);

      const loadedWallet = await repository.findById(id);

      const expectedVersion = loadedWallet!.version;
      loadedWallet!.credit(Money.from("25.00"));

      await repository.save(loadedWallet!, expectedVersion);

      const versionBeforeDebit = loadedWallet!.version;
      loadedWallet!.debit(Money.from("25.00"));

      await repository.save(loadedWallet!, versionBeforeDebit);

      em.clear();

      const persisted = await repository.findById(id);

      expect(persisted?.balance.toString()).toBe("100.00");
      expect(persisted?.version).toBe(3);
    } finally {
      await em.nativeDelete(WalletOrmEntity, { id });
      em.clear();
    }
  });

  test("retorna null quando a carteira não existe", async () => {
    const em = orm!.em.fork();
    const repository = new WalletRepositoryImpl(em);

    const result = await repository.findById(
      "00000000-0000-4000-8000-000000000000",
    );

    expect(result).toBeNull();
  });

  test("rejeita atualização concorrente com versão desatualizada", async () => {
    const em1 = orm!.em.fork();
    const em2 = orm!.em.fork();
    const repository1 = new WalletRepositoryImpl(em1);
    const repository2 = new WalletRepositoryImpl(em2);
    const id = crypto.randomUUID();
    const playerId = `integration-player-${crypto.randomUUID()}`;

    try {
      await repository1.save(
        Wallet.create(id, playerId, "BRL", Money.from("100.00")),
      );

      // Duas operações carregam a mesma versão persistida.
      const wallet1 = await repository1.findById(id);
      const wallet2 = await repository2.findById(id);

      expect(wallet1).not.toBeNull();
      expect(wallet2).not.toBeNull();

      const expectedVersion1 = wallet1!.version;
      const expectedVersion2 = wallet2!.version;

      // A primeira operação atualiza o saldo e a versão.
      wallet1!.credit(Money.from("10.00"));
      await repository1.save(wallet1!, expectedVersion1);

      // A segunda tenta salvar usando a versão antiga.
      wallet2!.debit(Money.from("20.00"));

      await expect(
        repository2.save(wallet2!, expectedVersion2),
      ).rejects.toBeInstanceOf(WalletConcurrencyConflictError);

      em1.clear();

      const persisted = await repository1.findById(id);

      expect(persisted?.balance.toString()).toBe("110.00");
      expect(persisted?.version).toBe(2);
    } finally {
      await em1.nativeDelete(WalletOrmEntity, { id });
      em1.clear();
      em2.clear();
    }
  });
});
