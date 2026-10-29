import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import type { CurrencyCode } from "../../../enum/curreny";
import { LedgerEntryDirection } from "../../../domain/ledger-entry/ledger-entry-direction";

@Entity({ tableName: "ledger_entries" })
@Unique({
  name: "uq_ledger_entries_wager_transaction",
  properties: ["wagerTransactionId"],
})
export class LedgerEntryOrmEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Property({ type: "uuid" })
  walletId!: string;

  @Property({ type: "uuid" })
  wagerTransactionId!: string;

  @Property({ type: "string" })
  direction!: LedgerEntryDirection;

  @Property({ type: "numeric", precision: 20, scale: 2 })
  amount!: string;

  @Property({ type: "string", length: 3 })
  currency!: CurrencyCode;

  @Property({ type: "timestamptz" })
  createdAt!: Date;
}
