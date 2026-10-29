import { LedgerEntry } from "../../../domain/ledger-entry/ledger-entry.entity";
import { Money } from "../../../domain/money/money";
import { LedgerEntryOrmEntity } from "../entities/ledger-entry-orm.entity";

export class LedgerEntryMapper {
  static toDomain(entity: LedgerEntryOrmEntity): LedgerEntry {
    return LedgerEntry.create({
      id: entity.id,
      walletId: entity.walletId,
      wagerTransactionId: entity.wagerTransactionId,
      direction: entity.direction,
      amount: Money.from(entity.amount),
      currency: entity.currency,
      createdAt: entity.createdAt,
    });
  }
  static toPersistence(entry: LedgerEntry): LedgerEntryOrmEntity {
    const entity =
      new (LedgerEntryOrmEntity as new () => LedgerEntryOrmEntity)();

    entity.id = entry.id;
    entity.walletId = entry.walletId;
    entity.wagerTransactionId = entry.wagerTransactionId;
    entity.direction = entry.direction;
    entity.amount = entry.amount.toString();
    entity.currency = entry.currency;
    entity.createdAt = entry.createdAt;

    return entity;
  }
}
