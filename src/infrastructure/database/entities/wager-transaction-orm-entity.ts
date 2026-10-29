import {
  Entity,
  Index,
  PrimaryKey,
  Unique,
  Property,
  Enum,
} from "@mikro-orm/decorators/legacy";
import {
  WagerTransactionStatus,
  WagerTransactionType,
} from "../../../domain/wager-transaction/wager-transaction.type";
import type { CurrencyCode } from "../../../enum/curreny";

@Entity({ tableName: "wager_transactions" })
@Unique({
  name: "uq_wager_transactions_provider_idempontency",
  properties: ["providerId", "idempotencyKey"],
})
@Unique({
  name: "uq_wager_transactions_provider_external_id",
  properties: ["providerId", "externalTransactionId"],
})
@Index({
  name: "ix_wager_transactions_reference",
  properties: ["providerId", "referenceExternalTransactionId"],
})
export class WagerTransactionOrmEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Property({ type: "string", length: 100 })
  providerId!: string;

  @Property({ type: "string", length: 100 })
  playerId!: string;

  @Property({ type: "uuid" })
  walletId!: string;

  @Property({ type: "string", length: 150 })
  externalTransactionId!: string;

  @Property({ type: "string", length: 150 })
  idempotencyKey!: string;

  @Enum({ items: () => WagerTransactionType })
  type!: WagerTransactionType;

  @Property({ type: "numeric", precision: 20, scale: 2 })
  amount!: string;

  @Property({ type: "string", length: 3 })
  currency!: CurrencyCode;

  @Property({ type: "string", length: 150, nullable: true })
  roundId?: string;

  @Property({ type: "string", length: 150, nullable: true })
  referenceTransactionId?: string;

  @Property({ type: "string", length: 150, nullable: true })
  referenceExternalTransactionId?: string;

  @Enum({ items: () => WagerTransactionStatus })
  status!: WagerTransactionStatus;

  @Property({ type: "string", length: 128 })
  payloadHash!: string;

  @Property({ type: "string", length: 100, nullable: true })
  failureCode?: string;

  @Property({ type: "datetime" })
  createdAt!: Date;

  @Property({ type: "datetime", nullable: true })
  processedAt?: Date;
}
