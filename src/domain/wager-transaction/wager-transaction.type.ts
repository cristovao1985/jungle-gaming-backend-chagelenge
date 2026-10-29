export enum WagerTransactionType {
  OPENING = "OPENING", // interno: crédito de abertura da wallet
  BET = "BET",
  WIN = "WIN",
  LOSS = "LOSS",
  REFUND = "REFUND", // só pode referenciar um BET com status PROCESSED
  ROLLBACK = "ROLLBACK", // pode referenciar um BET, WIN ou REFUND com status PROCESSED
}

export enum WagerTransactionStatus {
  PENDING = "PENDING", // aceita, ainda não aplicada
  PENDING_REFERENCE = "PENDING_REFERENCE", // aguardando a transação referenciada
  PROCESSED = "PROCESSED", // aplicada (terminal)
  REJECTED = "REJECTED", // violação de regra de negócio (terminal)
  FAILED = "FAILED", // erro permanente de infraestrutura (terminal, auditável)
}
