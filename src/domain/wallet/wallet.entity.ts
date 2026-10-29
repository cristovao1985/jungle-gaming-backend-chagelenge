import { isCurrencyCode, type CurrencyCode } from "../../enum/curreny";
import { Money } from "../money/money";

export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: CurrencyCode,
    private _currentBalance: Money,
    private _currentVersion: number,
  ) {}

  static create(
    id: string,
    playerId: string,
    currency: CurrencyCode,
    initialBalance: Money = Money.zero(),
  ): Wallet {
    Wallet.validateIdentity(id, playerId, currency);

    if (initialBalance.isNegative()) {
      throw new Error("O saldo inicial nao pode ser negativo");
    }

    return new Wallet(id, playerId, currency, initialBalance, 1);
  }

  static rehydrate(
    id: string,
    playerId: string,
    currency: CurrencyCode,
    balance: Money,
    version: number,
  ): Wallet {
    Wallet.validateIdentity(id, playerId, currency);

    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error("A versão da carteira deve ser um inteiro positivo.");
    }

    if (balance.isNegative()) {
      throw new Error("O saldo da carteira nao pode ser negativo");
    }
    return new Wallet(id, playerId, currency, balance, version);
  }

  get balance(): Money {
    return this._currentBalance;
  }

  get version(): number {
    return this._currentVersion;
  }

  //ações de credito e debito em carteira
  credit(amount: Money): void {
    if (amount.isNegative() || amount.isZero()) {
      throw new Error("O valor do crédito deve ser maior que zero");
    }

    this._currentBalance = this._currentBalance.add(amount);
    this.increaseCurrentVersion();
  }

  debit(amount: Money): void {
    if (amount.isNegative() || amount.isZero()) {
      throw new Error("O valor do débito deve ser maior que zero");
    }

    if (this._currentBalance.lessThan(amount)) {
      throw new Error("Saldo insuficiente");
    }

    this._currentBalance = this._currentBalance.subtract(amount);
    this.increaseCurrentVersion();
  }

  // função que incrementa nova versao apos credito ou debito na carteira
  private increaseCurrentVersion(): void {
    this._currentVersion++;
  }

  private static validateIdentity(
    id: string,
    playerId: string,
    currency: CurrencyCode,
  ): void {
    if (id.trim().length === 0) {
      throw new Error("O ID da carteira não pode ser vazio");
    }

    if (playerId.trim().length === 0) {
      throw new Error("O ID do jogador não pode ser vazio");
    }

    if (!isCurrencyCode(currency)) {
      throw new Error("A moeda deve usar formato ISO 4217(BRL)");
    }
  }
}
