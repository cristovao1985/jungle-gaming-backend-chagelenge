import { Money } from "../../../domain/money/money";
import { Wallet } from "../../../domain/wallet/wallet.entity";
import { WalletOrmEntity } from "../entities/wallet-orm.entity";

export class WalletMapper {
  static toDomain(entity: WalletOrmEntity): Wallet {
    return Wallet.rehydrate(
      entity.id,
      entity.playerId,
      entity.currency,
      Money.from(entity.balance),
      entity.version,
    );
  }

  static toPersistence(wallet: Wallet): WalletOrmEntity {
    const entity = new (WalletOrmEntity as new () => WalletOrmEntity)();

    entity.id = wallet.id;
    entity.playerId = wallet.playerId;
    entity.currency = wallet.currency;
    entity.balance = wallet.balance.toString();
    entity.version = wallet.version;

    return entity;
  }
}
