import { isCurrencyCode } from "../../enum/curreny";
import type { CreateLedgerEntryProps } from "./create-leader-entry.props";
import { LedgerEntryDirection } from "./ledger-entry-direction";
export class LedgerEntry {
  private readonly creationDate: Date;

  private constructor(props: CreateLedgerEntryProps) {
    this.id = props.id;
    this.walletId = props.walletId;
    this.wagerTransactionId = props.wagerTransactionId;
    this.direction = props.direction;
    this.amount = props.amount;
    this.currency = props.currency;
    this.creationDate = new Date(props.createdAt ?? new Date().getTime());
  }

  readonly id: string;
  readonly walletId: string;
  readonly wagerTransactionId: string;
  readonly direction: LedgerEntryDirection;
  readonly amount: CreateLedgerEntryProps["amount"];
  readonly currency: CreateLedgerEntryProps["currency"];

  static create(props: CreateLedgerEntryProps): LedgerEntry {
    const requiredFields = [
      props.id,
      props.walletId,
      props.wagerTransactionId,
      props.currency,
    ];

    if (requiredFields.some((f) => !f.trim())) {
      throw new Error(
        "Campos obrigatórios do lançamento precisam ser preenchidos",
      );
    }

    if (!isCurrencyCode(props.currency)) {
      throw new Error("A moeda deve ser suportada pela aplicação.");
    }

    if (props.amount.isNegative() || props.amount.isZero()) {
      throw new Error("O valor do lançamento deve ser maior que zero");
    }

    if (!Object.values(LedgerEntryDirection).includes(props.direction)) {
      throw new Error("Direção do lançamento inválida");
    }

    const createdAt = props.createdAt ?? new Date();

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("A data de criação do lançamento é inválida");
    }

    return new LedgerEntry({
      ...props,
      createdAt,
    });
  }

  get createdAt(): Date {
    return new Date(this.creationDate.getTime());
  }
}
