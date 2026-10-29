export class ReferenceOperationConflictError extends Error {
  constructor() {
    super("Já existe uma operação processada para esta referência.");
    this.name = "ReferenceOperationConflictError";
  }
}
