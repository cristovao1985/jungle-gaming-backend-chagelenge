import type { EntityManager } from "@mikro-orm/postgresql";
import type { WalletRepository } from "./wallet.repository"; 
import { Wallet } from "../../../../domain/wallet/wallet.entity";
import { WalletOrmEntity } from "../../entities/wallet-orm.entity";
import { WalletMapper } from "../../mappers/wallet.mapper";
import { WalletConcurrencyConflictError } from "../../../../application/ports/wallet-conflict.error";

export class WalletRepositoryImpl implements WalletRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Wallet | null> {
    const entity = await this.em.findOne(WalletOrmEntity, { id });
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async findByPlayerIdAndCurrency(
    playerId: string,
    currency: string,
  ): Promise<Wallet | null> {
    const entity = await this.em.findOne(WalletOrmEntity, {
      playerId,
      currency,
    });

    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async save(wallet: Wallet, expectedVersion?: number): Promise<void> {
    if (expectedVersion === undefined) {
      const existing = await this.em.findOne(WalletOrmEntity, {
        id: wallet.id,
      });

      if (existing) {
        throw new WalletConcurrencyConflictError();
      }

      const entity = WalletMapper.toPersistence(wallet);
      this.em.persist(entity);
      await this.em.flush();
      return;
    }

    const affectedRows = await this.em.nativeUpdate(
      WalletOrmEntity,
      {
        id: wallet.id,
        version: expectedVersion,
      },
      {
        playerId: wallet.playerId,
        currency: wallet.currency,
        balance: wallet.balance.toString(),
        version: wallet.version,
      },
    );

    if (affectedRows !== 1) {
      throw new WalletConcurrencyConflictError();
    }
  }
}
