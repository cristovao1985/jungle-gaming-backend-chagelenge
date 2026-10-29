import { describe, expect, mock, test } from "bun:test";
import { Money } from "../../../../../domain/money/money"; 
import { WagerTransaction } from "../../../../../domain/wager-transaction/wager-transaction.entity"; 
import { WagerTransactionType } from "../../../../../domain/wager-transaction/wager-transaction.type"; 
import { WagerTransactionRepositoryImpl } from "../wager-transaction.repository.impl"; 
import { WagerTransactionOrmEntity } from "../../../entities/wager-transaction-orm-entity"; 
import type { EntityManager } from "@mikro-orm/postgresql";
import { WagerTransactionMapper } from "../../../mappers/wager-transaction.mapper"; 

function makeTransaction(): WagerTransaction {
  return WagerTransaction.create({
    id: "transaction-1",
    providerId: "provider-1",
    playerId: "player-1",
    walletId: "wallet-1",
    externalTransactionId: "external-1",
    idempontencyKey: "idempotency-1",
    type: WagerTransactionType.BET,
    amount: Money.from("10.00"),
    currency: "BRL",
    payloadHash: "hash-1",
  });
}

describe("Wager Transaction Repository Impl", () => {
  test("converte a transacao de dominio e persiste entidade ORM", async () => {
    const em = {
      persist: mock(() => {}),
      flush: mock(async () => {}),
    } as unknown as EntityManager;

    const repository = new WagerTransactionRepositoryImpl(em);
    const transaction = makeTransaction();

    await repository.save(transaction);

    expect(em.persist).toHaveBeenCalledTimes(1);
    expect(em.flush).toHaveBeenCalledTimes(1);

    const persistedEntity = (
      em.persist as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]![0]!;

    expect(persistedEntity).toBeInstanceOf(WagerTransactionOrmEntity);
    expect(persistedEntity).toMatchObject({
      id: transaction.id,
      providerId: transaction.providerId,
      externalTransactionId: transaction.externalTransactionId,
      idempotencyKey: transaction.idempotencyKey,
      status: transaction.status,
      payloadHash: transaction.payloadHash,
    });
  });

  test("retorna a transacao de dominio quando encontra uma entidade ORM", async () => {
    const transaction = makeTransaction();
    const ormEntity = WagerTransactionMapper.toPersistence(transaction);

    const em = {
      findOne: mock(async () => ormEntity),
      persist: mock(() => {}),
      flush: mock(async () => {}),
    } as unknown as EntityManager;

    const repository = new WagerTransactionRepositoryImpl(em);
    const result = await repository.findById(transaction.id);

    expect(result).toBeInstanceOf(WagerTransaction);
    expect(result?.id).toBe(transaction.id);
    expect(result?.createdAt.getTime()).toBe(transaction.createdAt.getTime());
  });
});
