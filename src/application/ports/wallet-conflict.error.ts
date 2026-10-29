export class WalletConcurrencyConflictError extends Error {
  constructor() {
    super(
      "A carteira foi atualizada por outra operação. Recarregue o saldo e tente novamente.",
    );
    this.name = "WalletConcurrencyConflictError";
  }
}
