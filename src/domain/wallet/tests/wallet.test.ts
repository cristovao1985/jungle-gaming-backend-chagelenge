import { describe, expect, test } from "bun:test";
import { Money } from "../../money/money";
import { Wallet } from "../wallet.entity";
import { findCurrency } from "../../../enum/curreny";
const currency = findCurrency("BRL");

describe("Wallet", () => {
  test("cria carteira com saldo 0 e versao 1", () => {
    const wallet = Wallet.create(
      "wallet-123",
      "player-anon123",
      currency!.code,
    );

    expect(wallet.balance.toString()).toBe("0.00");
    expect(wallet.version).toBe(1);
  });

  test("debita saldo e incrementa versao", () => {
    const wallet = Wallet.create(
      "wallet-123",
      "player-anon123",
      currency!.code,
      Money.from("100.00"),
    );

    wallet.debit(Money.from("15.00"));

    expect(wallet.balance.toString()).toBe("85.00");
    expect(wallet.version).toBe(2);
  });

  test("rejeita debito maios que saldo e mantem versao atual sem incremento", () => {
    const wallet = Wallet.create(
      "wallet-123",
      "player-anon123",
      currency!.code,
      Money.from("100.00"),
    );

    expect(() => wallet.debit(Money.from("100.10"))).toThrow(
      "Saldo insuficiente",
    );

    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.version).toBe(1);
  });

  test("rejeita saldo inicial negativo ou não informado", () => {
    expect(() =>
      Wallet.create(
        "wallet-123",
        "player-anon123",
        currency!.code,
        Money.from("-100.00"),
      ),
    ).toThrow("O saldo inicial nao pode ser negativo");

    expect(() =>
      Wallet.create(
        "wallet-123",
        "player-anon123",
        currency!.code,
        Money.from(""),
      ),
    ).toThrow("O valor não pode ser vazio");
  });

  test("recria carteira preservando saldo e versao", () => {
    const wallet = Wallet.rehydrate(
      "wallet-123",
      "player-anon123",
      currency!.code,
      Money.from("700.00"),
      18,
    );

    expect(wallet.balance.toString()).toBe("700.00");
    expect(wallet.version).toBe(18);
  });

  test("mantem saldo e versao da carteira quando um debito é rejeitado", () => {
    const wallet = Wallet.create(
      "wallet-11",
      "pirate-anoun",
      currency!.code,
      Money.from("10.00"),
    );

    expect(() => wallet.debit(Money.from("23.00"))).toThrow(
      "Saldo insuficiente",
    );

    expect(wallet.balance.toString()).toBe("10.00");
    expect(wallet.version).toBe(1);
  });

  test("rejeita moeda em formato invalido", () => {
    expect(() => Wallet.create("wallet-20026", "player-john", "brl")).toThrow(
      "A moeda deve usar formato ISO 4217(BRL)",
    );
  });

  test("rejeita versao invalida durante reconstrucao da carteira", () => {
    expect(() =>
      Wallet.rehydrate(
        "wallet-122",
        "x-player",
        currency!.code,
        Money.from("1000.00"),
        0,
      ),
    ).toThrow("A versão da carteira deve ser um inteiro positivo.");
  });

  test("credita saldo e incrementa versao", () => {
    const wallet = Wallet.create(
      "wallet-credit",
      "player-001",
      currency!.code,
      Money.from("100.00"),
    );

    wallet.credit(Money.from("25.50"));

    expect(wallet.balance.toString()).toBe("125.50");
    expect(wallet.version).toBe(2);
  });

  test("rejeita credito com valor zero sem alterar saldo ou versao", () => {
    const wallet = Wallet.create(
      "wallet-credit-zero",
      "player-001",
      currency!.code,
      Money.from("100.00"),
    );

    expect(() => wallet.credit(Money.from("0.00"))).toThrow(
      "O valor do crédito deve ser maior que zero",
    );

    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.version).toBe(1);
  });

  test("rejeita credito com valor negativo sem alterar saldo ou versao", () => {
    const wallet = Wallet.create(
      "wallet-credit-negative",
      "player-001",
      currency!.code,
      Money.from("100.00"),
    );

    expect(() => wallet.credit(Money.from("-10.00"))).toThrow(
      "O valor do crédito deve ser maior que zero",
    );

    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.version).toBe(1);
  });

  test("rejeita debito com valor zero sem alterar saldo ou versao", () => {
    const wallet = Wallet.create(
      "wallet-debit-zero",
      "player-001",
      currency!.code,
      Money.from("100.00"),
    );

    expect(() => wallet.debit(Money.from("0.00"))).toThrow(
      "O valor do débito deve ser maior que zero",
    );

    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.version).toBe(1);
  });

  test("rejeita debito com valor negativo sem alterar saldo ou versao", () => {
    const wallet = Wallet.create(
      "wallet-debit-negative",
      "player-001",
      currency!.code,
      Money.from("100.00"),
    );

    expect(() => wallet.debit(Money.from("-10.00"))).toThrow(
      "O valor do débito deve ser maior que zero",
    );

    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.version).toBe(1);
  });
});
