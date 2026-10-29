import { isCurrencyCode, type CurrencyCode } from "../../enum/curreny";
import type { CreateWagerTransactionProps } from "./create-wager-transaction-props";
import { LedgerDirection } from "./ledger-direction.type";
import {
  WagerTransactionStatus,
  WagerTransactionType,
} from "./wager-transaction.type";

export class WagerTransaction {
  private currentStatus: WagerTransactionStatus;
  private currentProcessedAt: Date | undefined;
  private currentFailureCode: string | undefined;

  private constructor(
    wagerTransactionProps: CreateWagerTransactionProps,
    status: WagerTransactionStatus = WagerTransactionStatus.PENDING,
    processedAt?: Date,
    failureCode?: string,
  ) {
    this.id = wagerTransactionProps.id;
    this.providerId = wagerTransactionProps.providerId;
    this.playerId = wagerTransactionProps.playerId;
    this.walletId = wagerTransactionProps.walletId;
    this.externalTransactionId = wagerTransactionProps.externalTransactionId;
    this.idempotencyKey = wagerTransactionProps.idempontencyKey;
    this.type = wagerTransactionProps.type;
    this.amount = wagerTransactionProps.amount;
    this.currency = wagerTransactionProps.currency;
    this.roundId = wagerTransactionProps.roundId;
    this.referenceTransactionId = wagerTransactionProps.referenceTransactionId;
    this.referenceExternalTransactionId =
      wagerTransactionProps.referenceExternalTransactionId;
    this.creationDate = new Date(
      (wagerTransactionProps.createdAt ?? new Date()).getTime(),
    );
    this.currentStatus = status;
    this.currentProcessedAt = processedAt
      ? new Date(processedAt.getTime())
      : undefined;
    this.payloadHash = wagerTransactionProps.payloadHash;
    this.currentFailureCode = failureCode;
  }

  public readonly id: string;
  public readonly providerId: string;
  public readonly playerId: string;
  public readonly walletId: string;
  public readonly externalTransactionId: string;
  public readonly idempotencyKey: string;
  public readonly type: CreateWagerTransactionProps["type"];
  public readonly amount: CreateWagerTransactionProps["amount"];
  public readonly currency: CurrencyCode;
  public readonly roundId: string | undefined;
  public readonly referenceTransactionId: string | undefined;
  public readonly referenceExternalTransactionId: string | undefined;
  public readonly payloadHash: string;
  private readonly creationDate: Date;

  static create(props: CreateWagerTransactionProps): WagerTransaction {
    const requiredFields = [
      props.id,
      props.providerId,
      props.playerId,
      props.walletId,
      props.externalTransactionId,
      props.idempontencyKey,
      props.currency,
    ];

    if (requiredFields.some((p) => !p.trim())) {
      throw new Error("Campos obrigatorio precisam ser preenchidos");
    }

    if (!isCurrencyCode(props.currency)) {
      throw new Error("A moeda deve ser suportada pela aplicação.");
    }

    if (props.amount.isNegative() || props.amount.isZero()) {
      throw new Error("O valor da transação deve ser maior que zero");
    }

    if (props.type === WagerTransactionType.OPENING) {
      throw new Error(
        "OPENING é um tipo de transação interno, reservado à criação de carteira",
      );
    }

    if (
      (props.type === WagerTransactionType.REFUND ||
        props.type === WagerTransactionType.ROLLBACK) &&
      !props.referenceExternalTransactionId?.trim()
    ) {
      throw new Error(
        "Transações REFUND e ROLLBACK exigem uma transação de referência externa",
      );
    }

    const createdAt = props.createdAt ?? new Date();

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("A data de criação é invalida");
    }

    return new WagerTransaction({
      ...props,
      createdAt,
    });
  }

  static rehydrate(
    props: CreateWagerTransactionProps & {
      status: WagerTransactionStatus;
      processedAt?: Date;
      failureCode?: string;
    },
  ): WagerTransaction {
    const { status, processedAt, ...transactionProps } = props;

    const createdAt = transactionProps.createdAt ?? new Date();

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("A data de criação é inválida");
    }

    if (status === WagerTransactionStatus.PROCESSED && !processedAt) {
      throw new Error(
        "Uma transação processada precisa ter data de processamento",
      );
    }

    if (
      status !== WagerTransactionStatus.PROCESSED &&
      processedAt !== undefined
    ) {
      throw new Error(
        "Somente transações processadas podem ter data de processamento",
      );
    }

    if (
      processedAt &&
      (Number.isNaN(processedAt.getTime()) ||
        processedAt.getTime() < createdAt.getTime())
    ) {
      throw new Error("A data de processamento é inválida");
    }

    return new WagerTransaction(
      { ...transactionProps, createdAt },
      status,
      processedAt,
    );
  }

  static createNewOpening(
    props: CreateWagerTransactionProps,
    processedAt: Date,
  ): WagerTransaction {
    if (props.type !== WagerTransactionType.OPENING) {
      throw new Error("Apenas um método com status OPENING é aceito");
    }

    const requiredFields = [
      props.id,
      props.providerId,
      props.playerId,
      props.walletId,
      props.externalTransactionId,
      props.idempontencyKey,
      props.currency,
      props.payloadHash,
    ];

    if (requiredFields.some((f) => !f.trim())) {
      throw new Error("Campos obrigatórios precisam ser preenchidos");
    }

    if (!isCurrencyCode(props.currency)) {
      throw new Error("A moeda deve ser suportada pela aplicação.");
    }

    if (props.amount.isNegative() || props.amount.isZero()) {
      throw new Error("O valor da abertura deve ser maior que zero.");
    }

    const createdAt = props.createdAt ?? new Date();

    if (
      Number.isNaN(createdAt.getTime()) ||
      Number.isNaN(processedAt.getTime()) ||
      processedAt.getTime() < createdAt.getTime()
    ) {
      throw new Error("As datas da abertura são inválidas.");
    }

    return new WagerTransaction(
      {
        ...props,
      },
      WagerTransactionStatus.PROCESSED,
      processedAt,
    );
  }

  get status(): WagerTransactionStatus {
    return this.currentStatus;
  }

  get processedAt(): Date | undefined {
    return this.currentProcessedAt
      ? new Date(this.currentProcessedAt.getTime())
      : undefined;
  }

  get createdAt(): Date {
    return new Date(this.creationDate.getTime());
  }

  get failureCode(): string | undefined {
    return this.currentFailureCode;
  }

  markTransactionAsProcessed(processedAt: Date = new Date()): void {
    if (this.currentStatus !== WagerTransactionStatus.PENDING) {
      throw new Error(
        "Somente transação com status PENDING podem ser processadas",
      );
    }

    if (Number.isNaN(processedAt.getTime())) {
      throw new Error("A data de processamento é invalida");
    }

    if (processedAt.getTime() < this.creationDate.getTime()) {
      throw new Error(
        "A data de processamento nao pode ser anterior à data de criação",
      );
    }

    this.currentStatus = WagerTransactionStatus.PROCESSED;
    this.currentProcessedAt = new Date(processedAt.getTime());
  }

  markTransactionAsRejected(failureCode: string): void {
    if (this.currentStatus !== WagerTransactionStatus.PENDING) {
      throw new Error(
        "Somente transação com status PENDING podem ser rejeitadas",
      );
    }

    if (!failureCode?.trim()) {
      throw new Error("Código de falha é obrigatório");
    }

    this.currentStatus = WagerTransactionStatus.REJECTED;
    this.currentFailureCode = failureCode;
  }

  markTransactionAsFailed(failureCode: string): void {
    if (this.currentStatus !== WagerTransactionStatus.PENDING) {
      throw new Error("Somente transação com status PENDING podem falhar");
    }

    if (!failureCode?.trim()) {
      throw new Error("Código de falha é obrigatório");
    }

    this.currentStatus = WagerTransactionStatus.FAILED;
    this.currentFailureCode = failureCode;
  }

  markTransactionAsPendingReference(): void {
    if (this.currentStatus !== WagerTransactionStatus.PENDING) {
      throw new Error(
        "Somente transação com status PENDING podem aguardar por referencia",
      );
    }

    this.currentStatus = WagerTransactionStatus.PENDING_REFERENCE;
  }

  resumeTransactionAfterReferenceFound(): void {
    if (this.currentStatus !== WagerTransactionStatus.PENDING_REFERENCE) {
      throw new Error(
        "Somente transação com status PENDING_REFERENCE podem ser retomadas",
      );
    }

    this.currentStatus = WagerTransactionStatus.PENDING;
  }

  isTerminal(): boolean {
    return [
      WagerTransactionStatus.PROCESSED,
      WagerTransactionStatus.REJECTED,
      WagerTransactionStatus.FAILED,
    ].includes(this.currentStatus);
  }

  canChangeBalance(): boolean {
    return this.type !== WagerTransactionType.LOSS;
  }

  requiresReference(): boolean {
    return [
      WagerTransactionType.REFUND,
      WagerTransactionType.ROLLBACK,
    ].includes(this.type);
  }

  payloadHashAlreadyExists(payloadHash: string): boolean {
    return this.payloadHash === payloadHash;
  }

  ledgerDirection(referenceType?: WagerTransactionType): LedgerDirection {
    switch (this.type) {
      case WagerTransactionType.BET:
        return LedgerDirection.DEBIT;

      case WagerTransactionType.WIN:
        return LedgerDirection.CREDIT;

      case WagerTransactionType.REFUND:
        return LedgerDirection.CREDIT;

      case WagerTransactionType.LOSS:
        return LedgerDirection.NONE;

      case WagerTransactionType.ROLLBACK: // Roll é o inverso da ultima transação
        if (referenceType === WagerTransactionType.BET) {
          return LedgerDirection.CREDIT;
        }

        if (
          referenceType == WagerTransactionType.WIN ||
          referenceType == WagerTransactionType.REFUND
        ) {
          return LedgerDirection.DEBIT;
        }

        throw new Error("Tipo de transação inválida no ROLLBACK");

      default:
        throw new Error("Tipo de transação nao suporta o ledger");
    }
  }

  canReferenceTransaction(reference: WagerTransaction): boolean {
    if (!this.requiresReference()) {
      // nao pode criar transacao se referencia for obrigatoria
      return false;
    }

    if (reference.status !== WagerTransactionStatus.PROCESSED) {
      // nao pode criar transacao se o status nao por PROCESSED
      return false;
    }

    if (
      this.providerId !== reference.providerId ||
      this.playerId !== reference.playerId ||
      this.walletId !== reference.walletId ||
      this.currency !== reference.currency
    ) {
      return false;
    }
    if ((this.roundId ?? null) !== (reference.roundId ?? null)) {
      return false;
    }

    if (!this.amount.equals(reference.amount)) {
      return false;
    }

    if (this.type === WagerTransactionType.REFUND) {
      return reference.type === WagerTransactionType.BET;
    }

    if (this.type === WagerTransactionType.ROLLBACK) {
      return [
        WagerTransactionType.BET,
        WagerTransactionType.WIN,
        WagerTransactionType.REFUND,
      ].includes(reference.type);
    }

    return false;
  }
}
