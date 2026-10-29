import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import type { CurrencyCode } from "../../../enum/curreny";

@Entity({ tableName: "wallets" })
@Unique({
  name: "uq_wallets_player_currency",
  properties: ["playerId", "currency"],
})
export class WalletOrmEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Property({ type: "string", length: 100 })
  playerId!: string;

  @Property({ type: "string", length: 3 })
  currency!: CurrencyCode;

  @Property({ type: "numeric", precision: 20, scale: 2 })
  balance!: string;

  @Property({ type: "integer", default: 1 })
  version!: number;
}
