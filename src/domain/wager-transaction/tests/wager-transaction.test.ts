import { describe, expect, test } from "bun:test";
import { Money } from "../../money/money";
import { makeWagerTransactionProps } from "../wager-transaction.factory";
import { WagerTransaction } from "../wager-transaction.entity";
import {
  WagerTransactionStatus,
  WagerTransactionType,
} from "../wager-transaction.type";

import type { CreateWagerTransactionProps } from "../create-wager-transaction-props";
import { LedgerDirection } from "../ledger-direction.type";

function createTransaction(
  overrides: Partial<CreateWagerTransactionProps> = {},
): WagerTransaction {
  return WagerTransaction.create(makeWagerTransactionProps(overrides));
}

describe("Wager Transaction", () => {
  describe("criação", () => {
    test("cria uma transação válida com status PENDING", () => {
      const transaction = createTransaction({
        amount: Money.from("72.00"),
      });

      expect(transaction.id).toBe("transaction-0001");
      expect(transaction.type).toBe(WagerTransactionType.BET);
      expect(transaction.amount.toString()).toBe("72.00");
      expect(transaction.currency).toBe("BRL");
      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
      expect(transaction.processedAt).toBeUndefined();
      expect(transaction.payloadHash).toBe("hash-de-teste-001");
    });

    test("rejeita um campo obrigatório vazio", () => {
      expect(() => createTransaction({ id: "" })).toThrow(
        "Campos obrigatorio precisam ser preenchidos",
      );
    });

    test("rejeita valor zero", () => {
      expect(() => createTransaction({ amount: Money.from("0.00") })).toThrow(
        "O valor da transação deve ser maior que zero",
      );
    });

    test("rejeita valor negativo", () => {
      expect(() => createTransaction({ amount: Money.from("-10.00") })).toThrow(
        "O valor da transação deve ser maior que zero",
      );
    });

    test("rejeita moeda não suportada", () => {
      expect(() => createTransaction({ currency: "USD" as "BRL" })).toThrow(
        "A moeda deve ser suportada pela aplicação.",
      );
    });

    test("rejeita OPENING em uma transação externa", () => {
      expect(() =>
        createTransaction({ type: WagerTransactionType.OPENING }),
      ).toThrow(
        "OPENING é um tipo de transação interno, reservado à criação de carteira",
      );
    });

    test("rejeita data de criação inválida", () => {
      expect(() =>
        createTransaction({ createdAt: new Date("invalid-date") }),
      ).toThrow("A data de criação é invalida");
    });

    test("preserva o payloadHash informado", () => {
      const transaction = createTransaction({
        payloadHash: "hash-personalizado",
      });

      expect(transaction.payloadHash).toBe("hash-personalizado");
    });
  });

  describe("datas", () => {
    test("não permite alterar a data de criação pelo getter", () => {
      const originalDate = new Date("2026-10-26T12:00:00.000Z");
      const transaction = createTransaction({ createdAt: originalDate });

      transaction.createdAt.setFullYear(2000);

      expect(transaction.createdAt.toISOString()).toBe(
        "2026-10-26T12:00:00.000Z",
      );
    });

    test("processa uma transação e registra a data", () => {
      const transaction = createTransaction({
        createdAt: new Date("2026-10-27T10:00:00.000Z"),
      });
      const processedAt = new Date("2026-10-27T11:00:00.000Z");

      transaction.markTransactionAsProcessed(processedAt);

      expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
      expect(transaction.processedAt?.toISOString()).toBe(
        "2026-10-27T11:00:00.000Z",
      );
    });

    test("rejeita data de processamento inválida sem alterar o status", () => {
      const transaction = createTransaction();

      expect(() =>
        transaction.markTransactionAsProcessed(new Date("invalid-date")),
      ).toThrow("A data de processamento é invalida");

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("rejeita processamento anterior à criação", () => {
      const transaction = createTransaction({
        createdAt: new Date("2026-10-27T16:32:00.000Z"),
      });

      expect(() =>
        transaction.markTransactionAsProcessed(
          new Date("2026-10-27T12:20:00.000Z"),
        ),
      ).toThrow(
        "A data de processamento nao pode ser anterior à data de criação",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("não permite alterar a data de processamento pelo getter", () => {
      const transaction = createTransaction({
        createdAt: new Date("2026-10-27T16:30:00.000Z"),
      });

      transaction.markTransactionAsProcessed(
        new Date("2026-10-27T16:32:00.000Z"),
      );

      const processedAt = transaction.processedAt;
      processedAt?.setUTCFullYear(2020);

      expect(transaction.processedAt?.toISOString()).toBe(
        "2026-10-27T16:32:00.000Z",
      );
    });
  });

  describe("transições de status", () => {
    test("permite mudar de PENDING para REJECTED", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsRejected("TEST_REJECTION");

      expect(transaction.status).toBe(WagerTransactionStatus.REJECTED);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("permite mudar de PENDING para FAILED", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsFailed("TEST_REJECTION");

      expect(transaction.status).toBe(WagerTransactionStatus.FAILED);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("permite mudar de PENDING para PENDING_REFERENCE", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsPendingReference();

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING_REFERENCE);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("permite retomar uma transação após encontrar a referência", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsPendingReference();
      transaction.resumeTransactionAfterReferenceFound();

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("permite processar após retomar uma transação", () => {
      const transaction = createTransaction({
        createdAt: new Date("2026-10-27T10:00:00.000Z"),
      });

      transaction.markTransactionAsPendingReference();
      transaction.resumeTransactionAfterReferenceFound();
      transaction.markTransactionAsProcessed(
        new Date("2026-10-27T12:21:00.000Z"),
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
      expect(transaction.processedAt?.toISOString()).toBe(
        "2026-10-27T12:21:00.000Z",
      );
    });

    test("não permite processar uma transação duas vezes", () => {
      const transaction = createTransaction({
        createdAt: new Date("2026-10-27T10:00:00.000Z"),
      });
      const processedAt = new Date("2026-10-27T13:01:00.000Z");

      transaction.markTransactionAsProcessed(processedAt);

      expect(() => transaction.markTransactionAsProcessed(processedAt)).toThrow(
        "Somente transação com status PENDING podem ser processadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
      expect(transaction.processedAt?.toISOString()).toBe(
        "2026-10-27T13:01:00.000Z",
      );
    });

    test("não permite processar uma transação REJECTED", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsRejected("TEST_REJECTION");

      expect(() => transaction.markTransactionAsProcessed()).toThrow(
        "Somente transação com status PENDING podem ser processadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.REJECTED);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("não permite processar uma transação FAILED", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsFailed("TEST_REJECTION");

      expect(() => transaction.markTransactionAsProcessed()).toThrow(
        "Somente transação com status PENDING podem ser processadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.FAILED);
      expect(transaction.processedAt).toBeUndefined();
    });

    test("não permite rejeitar uma transação já processada", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsProcessed();

      expect(() => transaction.markTransactionAsRejected("TEST_REJECTION")).toThrow(
        "Somente transação com status PENDING podem ser rejeitadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
    });

    test("não permite falhar uma transação já processada", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsProcessed();

      expect(() => transaction.markTransactionAsFailed("TEST_REJECTION")).toThrow(
        "Somente transação com status PENDING podem falhar",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
    });

    test("não permite aguardar referência após o processamento", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsProcessed();

      expect(() => transaction.markTransactionAsPendingReference()).toThrow(
        "Somente transação com status PENDING podem aguardar por referencia",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
    });

    test("não permite aguardar referência após rejeição", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsRejected("TEST_REJECTION");

      expect(() => transaction.markTransactionAsPendingReference()).toThrow(
        "Somente transação com status PENDING podem aguardar por referencia",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.REJECTED);
    });

    test("não permite retomar uma transação que não aguarda referência", () => {
      const transaction = createTransaction();

      expect(() => transaction.resumeTransactionAfterReferenceFound()).toThrow(
        "Somente transação com status PENDING_REFERENCE podem ser retomadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
    });

    test("não permite retomar uma transação REJECTED", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsRejected("TEST_REJECTION");

      expect(() => transaction.resumeTransactionAfterReferenceFound()).toThrow(
        "Somente transação com status PENDING_REFERENCE podem ser retomadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.REJECTED);
    });

    test("não permite rejeitar uma transação FAILED", () => {
      const transaction = createTransaction();

      transaction.markTransactionAsFailed("TEST_REJECTION");

      expect(() => transaction.markTransactionAsRejected("TEST_REJECTION")).toThrow(
        "Somente transação com status PENDING podem ser rejeitadas",
      );

      expect(transaction.status).toBe(WagerTransactionStatus.FAILED);
    });
  });

  describe("consultas de estado", () => {
    test.each([
      [WagerTransactionStatus.PROCESSED, true],
      [WagerTransactionStatus.REJECTED, true],
      [WagerTransactionStatus.FAILED, true],
      [WagerTransactionStatus.PENDING, false],
      [WagerTransactionStatus.PENDING_REFERENCE, false],
    ])("isTerminal identifica %s corretamente", (status, expected) => {
      const transaction = createTransaction();

      if (status === WagerTransactionStatus.PROCESSED) {
        transaction.markTransactionAsProcessed();
      } else if (status === WagerTransactionStatus.REJECTED) {
        transaction.markTransactionAsRejected("TEST_REJECTION");
      } else if (status === WagerTransactionStatus.FAILED) {
        transaction.markTransactionAsFailed("TEST_REJECTION");
      } else if (status === WagerTransactionStatus.PENDING_REFERENCE) {
        transaction.markTransactionAsPendingReference();
      }

      expect(transaction.isTerminal()).toBe(expected);
    });

    test("LOSS não altera o saldo", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.LOSS,
      });

      expect(transaction.canChangeBalance()).toBe(false);
    });

    test("BET altera o saldo", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.BET,
      });

      expect(transaction.canChangeBalance()).toBe(true);
    });

    test("REFUND exige referência", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.REFUND,
        referenceExternalTransactionId: "external-bet-001",
      });

      expect(transaction.requiresReference()).toBe(true);
    });

    test("ROLLBACK exige referência", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.ROLLBACK,
        referenceExternalTransactionId: "external-bet-001",
      });

      expect(transaction.requiresReference()).toBe(true);
    });

    test("BET não exige referência", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.BET,
      });

      expect(transaction.requiresReference()).toBe(false);
    });
  });

  describe("referências de transação", () => {
    test("rejeita REFUND sem referência externa", () => {
      expect(() =>
        createTransaction({
          type: WagerTransactionType.REFUND,
          referenceExternalTransactionId: "",
        }),
      ).toThrow();
    });

    test("rejeita ROLLBACK sem referência externa", () => {
      expect(() =>
        createTransaction({
          type: WagerTransactionType.ROLLBACK,
          referenceExternalTransactionId: "",
        }),
      ).toThrow();
    });

    test("cria REFUND com referências", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.REFUND,
        referenceTransactionId: "transaction-bet-0001",
        referenceExternalTransactionId: "external-bet-0001",
      });

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
      expect(transaction.referenceTransactionId).toBe("transaction-bet-0001");
      expect(transaction.referenceExternalTransactionId).toBe(
        "external-bet-0001",
      );
    });

    test("cria ROLLBACK com referências", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.ROLLBACK,
        referenceTransactionId: "transaction-bet-0001",
        referenceExternalTransactionId: "external-bet-0001",
      });

      expect(transaction.status).toBe(WagerTransactionStatus.PENDING);
      expect(transaction.referenceTransactionId).toBe("transaction-bet-0001");
      expect(transaction.referenceExternalTransactionId).toBe(
        "external-bet-0001",
      );
    });
  });

  describe("idempotencia", () => {
    test("retorna true quando payloadhash é igual", () => {
      const transaction = createTransaction({
        payloadHash: "hash-original",
      });

      expect(transaction.payloadHashAlreadyExists("hash-original")).toBe(true);
    });

    test("retorna false quando payloadhash é diferente", () => {
      const transaction = createTransaction({
        payloadHash: "hash-original",
      });

      expect(transaction.payloadHashAlreadyExists("hash-diferente")).toBe(
        false,
      );
    });
  });

  describe("direção do ledger", () => {
    test("transação do tipo BET gera débito", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.BET,
      });

      expect(transaction.ledgerDirection()).toBe(LedgerDirection.DEBIT);
    });

    test("transação do tipo WIN gera crédito", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.WIN,
      });

      expect(transaction.ledgerDirection()).toBe(LedgerDirection.CREDIT);
    });

    test("transação do tipo LOSS nao gera movimentacao", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.LOSS,
      });

      expect(transaction.ledgerDirection()).toBe(LedgerDirection.NONE);
    });

    test("transação do tipo REFUND gera crédito", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.REFUND,
        referenceExternalTransactionId: "external-ref",
      });

      expect(transaction.ledgerDirection()).toBe(LedgerDirection.CREDIT);
    });

    test("transação do tipo ROLLBACK para BET gera crédito", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.ROLLBACK,
        referenceExternalTransactionId: "external-ref",
      });

      expect(transaction.ledgerDirection(WagerTransactionType.BET)).toBe(
        LedgerDirection.CREDIT,
      );
    });

    test("transação do tipo ROLLBACK para WIN gera débito", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.ROLLBACK,
        referenceExternalTransactionId: "external-ref",
      });

      expect(transaction.ledgerDirection(WagerTransactionType.WIN)).toBe(
        LedgerDirection.DEBIT,
      );
    });

    test("transação do tipo ROLLBACK para REFUND gera débito", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.ROLLBACK,
        referenceExternalTransactionId: "external-ref",
      });

      expect(transaction.ledgerDirection(WagerTransactionType.REFUND)).toBe(
        LedgerDirection.DEBIT,
      );
    });
    test("rejeita transação do tipo ROLLBACK se tipo nao for informada", () => {
      const transaction = createTransaction({
        type: WagerTransactionType.ROLLBACK,
        referenceExternalTransactionId: "external-ref",
      });

      expect(() => transaction.ledgerDirection()).toThrow(
        "Tipo de transação inválida no ROLLBACK",
      );
    });
  });

  describe("validacao de referencias", () => {
    function createdProcessedBet() {
      const reference = createTransaction({
        id: "bet-001",
        externalTransactionId: "external-bet-001",
        type: WagerTransactionType.BET,
        amount: Money.from("100.00"),
        createdAt: new Date("2026-10-27T10:01:00.000Z"),
      });

      reference.markTransactionAsProcessed(
        new Date("2026-10-27T10:02:00.000Z"),
      );

      return reference;
    }

    test("aceita REFUND de BET processada", () => {
      const reference = createdProcessedBet();

      const refund = createTransaction({
        id: "refund-001",
        externalTransactionId: "external-ref-001",
        type: WagerTransactionType.REFUND,
        amount: Money.from("100.00"),
        referenceExternalTransactionId: reference.externalTransactionId,
        createdAt: new Date("2026-10-27T10:03:00.000Z"),
      });

      expect(refund.canReferenceTransaction(reference)).toBe(true);
    });

    test("rejeita REFUND de WIN", () => {
      const reference = createTransaction({
        type: WagerTransactionType.WIN,
        createdAt: new Date("2026-10-27T11:06:00.000Z"),
      });

      reference.markTransactionAsProcessed(
        new Date("2026-10-27T12:01:00.000Z"),
      );

      const refund = createTransaction({
        type: WagerTransactionType.REFUND,
        referenceExternalTransactionId: reference.externalTransactionId,
        createdAt: new Date("2026-10-27T12:03:00.000Z"),
      });

      expect(refund.canReferenceTransaction(reference)).toBe(false);
    });

    test("rejeita referencia ainda nao processada", () => {
      const reference = createTransaction();

      const refund = createTransaction({
        type: WagerTransactionType.REFUND,
        referenceExternalTransactionId: reference.externalTransactionId,
      });

      expect(refund.canReferenceTransaction(reference)).toBe(false);
    });

    test("rejeita referencia de outra carteira", () => {
      const reference = createdProcessedBet();

      const refund = createTransaction({
        type: WagerTransactionType.REFUND,
        walletId: "wallet-diferente",
        referenceExternalTransactionId: reference.externalTransactionId,
      });

      expect(refund.canReferenceTransaction(reference)).toBe(false);
    });

    test("rejeita valores diferentes", () => {
      const reference = createdProcessedBet();

      const refund = createTransaction({
        type: WagerTransactionType.REFUND,
        amount: Money.from("99.00"),
        referenceExternalTransactionId: reference.externalTransactionId,
      });

      expect(refund.canReferenceTransaction(reference)).toBe(false);
    });
  });
});

describe("Wager Transaction - Create Opening", () => {
  test("cria uma transação com status OPENING e status PROCESSED", () => {
    const createdAt = new Date("2026-01-01T10:00:00.000Z");

    const props = makeWagerTransactionProps({
      type: WagerTransactionType.OPENING,
      createdAt,
    });

    const processedAt = new Date("2026-01-01T10:06:00.000Z");
    const transaction = WagerTransaction.createNewOpening(props, processedAt);

    expect(transaction.type).toBe(WagerTransactionType.OPENING);
    expect(transaction.status).toBe(WagerTransactionStatus.PROCESSED);
    expect(transaction.processedAt).toEqual(processedAt);
  });

  test("rejeita qualquer status que nao seja OPENING", () => {
    const props = makeWagerTransactionProps({
      type: WagerTransactionType.BET,
    });
    const processedAt = new Date();

    expect(() => WagerTransaction.createNewOpening(props, processedAt)).toThrow(
      "Apenas um método com status OPENING é aceito",
    );
  });
  
});
