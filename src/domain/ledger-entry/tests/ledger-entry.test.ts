import { describe, expect, test } from "bun:test";
import { Money } from "../../money/money";
import type { CreateLedgerEntryProps } from "../create-leader-entry.props";
import { LedgerEntryDirection } from "../ledger-entry-direction";
import { LedgerEntry } from "../ledger-entry.entity";

function createLedgerEntry(
  overrides: Partial<CreateLedgerEntryProps> = {},
): LedgerEntry {
  return LedgerEntry.create({
    id: "ledger-001",
    walletId: "wallet-001",
    wagerTransactionId: "transaction-001",
    direction: LedgerEntryDirection.DEBIT,
    amount: Money.from("50.00"),
    currency: "BRL",
    ...overrides,
  });
}

describe("Ledger Entry", () => {
  test("cria um lancamento valido em direcao DEBITO", () => {
    const entry = createLedgerEntry();

    expect(entry.id).toBe("ledger-001");
    expect(entry.walletId).toBe("wallet-001");
    expect(entry.wagerTransactionId).toBe("transaction-001");
    expect(entry.direction).toBe(LedgerEntryDirection.DEBIT);

    expect(entry.amount.toString()).toBe("50.00");
    expect(entry.currency).toBe("BRL");
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  test("cria um lancamento valido em direcao CREDITO", () => {
    const entry = createLedgerEntry({
      direction: LedgerEntryDirection.CREDIT,
    });

    expect(entry.id).toBe("ledger-001");
    expect(entry.walletId).toBe("wallet-001");
    expect(entry.wagerTransactionId).toBe("transaction-001");
    expect(entry.direction).toBe(LedgerEntryDirection.CREDIT);

    expect(entry.amount.toString()).toBe("50.00");
    expect(entry.currency).toBe("BRL");
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  test("crejeita criação de lancamento com campos obrigatorios vazios", () => {
    expect(() => createLedgerEntry({ id: "" })).toThrow();
    expect(() => createLedgerEntry({ walletId: "" })).toThrow();
    expect(() => createLedgerEntry({ wagerTransactionId: "" })).toThrow();
  });

  test("rejeita valor zero", () => {
    expect(() => createLedgerEntry({ amount: Money.from("0.00") })).toThrow(
      "O valor do lançamento deve ser maior que zero",
    );
  });

  test("rejeita valor negativo", () => {
    expect(() => createLedgerEntry({ amount: Money.from("-1.00") })).toThrow(
      "O valor do lançamento deve ser maior que zero",
    );
  });

  test("rejeita moeda não suportada", () => {
    expect(() => createLedgerEntry({ currency: "USD" as "BRL" })).toThrow(
      "A moeda deve ser suportada pela aplicação.",
    );
  });

  test("rejeita direção inválida", () => {
    expect(() =>
      createLedgerEntry({
        direction: "NONE" as LedgerEntryDirection,
      }),
    ).toThrow("Direção do lançamento inválida");
  });

  test("rejeita data de criação inválida", () => {
    expect(() =>
      createLedgerEntry({ createdAt: new Date("invalid-date") }),
    ).toThrow("A data de criação do lançamento é inválida");
  });

  test("não permite alterar a data de criação pelo getter", () => {
    const entry = createLedgerEntry({
      createdAt: new Date("2026-10-27T12:00:00.000Z"),
    });

    entry.createdAt.setUTCFullYear(2000);

    expect(entry.createdAt.toISOString()).toBe("2026-10-27T12:00:00.000Z");
  });
});
