import { describe, expect, test } from "bun:test";
import { Money } from "../money";

describe("Money", () => {
  test("rejeita valor que nao sehjam strings", () => {
    expect(() => Money.from(null as unknown as string)).toThrow();
    expect(() => Money.from(123 as unknown as string)).toThrow();
    expect(() => Money.from(undefined as unknown as string)).toThrow();
  });

  test("soma valores decimais sem perder precisao", () => {
    const first = Money.from("0.10");
    const second = Money.from("0.20");

    const result = first.add(second);

    expect(result.toString()).toBe("0.30");
  });

  test("rejeita valores com mais de 2 casas decimais", () => {
    expect(() => Money.from("1.9999")).toThrow();
  });

  test("rejeita notação cientifica", () => {
    expect(() => Money.from("1e3")).toThrow();
  });

  test("rejeita valores inválidos", () => {
    expect(() => Money.from("abc")).toThrow();
    expect(() => Money.from("abç$")).toThrow();
    expect(() => Money.from("")).toThrow();
    expect(() => Money.from(" ")).toThrow();
  });

  test("cria um valor inicial com 0", () => {
    expect(Money.zero().toString()).toBe("0.00");
  });

  test("subtrai valores com precisao", () => {
    const first = Money.from("1.90");
    const second = Money.from("0.45");

    expect(first.subtract(second).toString()).toBe("1.45");
  });

  test("nao altera os valores originais ao somar ou subtrair", () => {
    const first = Money.from("0.80");
    const second = Money.from("0.37");

    first.add(second);
    first.subtract(second);

    expect(first.toString()).toBe("0.80");
    expect(second.toString()).toBe("0.37");
  });

  test("identifica zero e valores negativos", () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.from("-1.11").isNegative()).toBe(true);
    expect(Money.from("100").isNegative()).toBe(false);
  });

  test("compara valores corretamente", () => {
    const one = Money.from("2.00");
    const anotherOne = Money.from("2.00");
    const two = Money.from("3.00");

    expect(one.equals(anotherOne)).toBe(true);
    expect(one.equals(two)).toBe(false);
    expect(two.greaterThan(one)).toBe(true);
    expect(two.greaterThanOrEqual(one)).toBe(true);
    expect(one.lessThan(two)).toBe(true);
    expect(one.lessThanOrEqual(anotherOne)).toBe(true);
  });

  test("inverte o sinal sem modificar o valor", () => {
    const original = Money.from("256.00");

    expect(original.negate().toString()).toBe("-256.00");
    expect(original.toString()).toBe("256.00");
    expect(Money.from("-300.0").negate().toString()).toBe("300.00");
  });

  test("serializa o valor para string decimal", () => {
    const money = Money.from("12.50");

    expect(money.toJSON()).toBe("12.50");
    expect(JSON.stringify({ balance: money })).toBe('{"balance":"12.50"}');
  });
});
