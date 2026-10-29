/**
 * AÇÃO: Representar um conflito de idempotência reconhecido pela aplicação.
 *
 * JUSTIFICATIVA: O caso de uso não deve depender dos detalhes internos
 * das exceções do PostgreSQL ou do MikroORM.
 *
 * REAÇÃO ESPERADA: O caso de uso poderá distinguir esse conflito de
 * outras falhas de persistência.
 *
 * VALIDAÇÃO: O erro possui um nome específico e uma mensagem identificável.
 */
export class IdempotencyConflictError extends Error {
  constructor() {
    super("A chave de idempotência já foi utilizada.");
    this.name = "IdempotencyConflictError";
  }
}
