import Decimal from "decimal.js";

export class Money {
  private constructor(private readonly amount: Decimal) {}

  static zero(): Money {
    return new Money(new Decimal("0"));
  }

  static from(value: string): Money {
    const normalizedValue = value.toString().trim();

    if (typeof value !== "string") {
      throw new Error("O valor informado deve ser uma string");
    }

    if (normalizedValue?.length === 0) {
      throw new Error("O valor não pode ser vazio.");
    }

    if (!/^-?\d+(\.\d{1,2})?$/.test(normalizedValue)) {
      throw new Error("Valor monetário inválido: use até duas casas decimais.");
    }

    const amount = new Decimal(normalizedValue);

    if (!amount.isFinite()) {
      throw new Error("O valor dever ser finito.");
    }

    return new Money(amount);
  }
  
  // regras para soma, subtração, conversao e validação de valores
  add(other: Money): Money {
    return new Money(this.amount.plus(other.amount));
  }

  subtract(other: Money): Money {
    return new Money(this.amount.minus(other.amount));
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  equals(other: Money): boolean {
    return this.amount.equals(other.amount);
  }

  greaterThan(other: Money): boolean {
    return this.amount.greaterThan(other.amount);
  }

  lessThan(other: Money): boolean {
    return this.amount.lessThan(other.amount);
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.amount.greaterThanOrEqualTo(other.amount);
  }

  lessThanOrEqual(other: Money): boolean {
    return this.amount.lessThanOrEqualTo(other.amount);
  }

  negate(): Money {
    return new Money(this.amount.negated());
  }

  toString(): string {
    return this.amount.toFixed(2);
  }

  toJSON(): string {
    return this.toString();
  }
}
