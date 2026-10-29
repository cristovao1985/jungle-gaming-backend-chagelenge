import type { EntityManager } from "@mikro-orm/postgresql";
import type { LedgerEntryRepository } from "./ledger-entry.repository";
import type { LedgerEntry } from "../../../../domain/ledger-entry/ledger-entry.entity";
import { LedgerEntryMapper } from "../../mappers/ledger-entry.mapper";
import { LedgerEntryOrmEntity } from "../../entities/ledger-entry-orm.entity";

export class LedgerEntryRepositoryImpl implements LedgerEntryRepository {
  constructor(private readonly em: EntityManager) {}

  async findByWalletId(
    walletId: string,
    options: {
      cursor?: string;
      limit: number;
    },
  ): Promise<{
    entries: LedgerEntry[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(Math.max(options.limit, 1), 100);

    const cursorEntry = options.cursor
      ? await this.em.findOne(LedgerEntryOrmEntity, {
          id: options.cursor,
          walletId,
        })
      : null;

    if (options.cursor && !cursorEntry) {
      throw new Error("Cursor do extrado inválido");
    }

    const where = cursorEntry
      ? {
          walletId,
          $or: [
            { createdAt: { $lt: cursorEntry.createdAt } },
            {
              createdAt: cursorEntry.createdAt,
              id: { $lt: cursorEntry.id },
            },
          ],
        }
      : { walletId };

    const entities = await this.em.find(
      LedgerEntryOrmEntity,
      where,
      {
        orderBy: { id: "DESC" },
        limit: limit + 1,
      },
    );

    const hasNextPage = entities.length > limit;
    const page = entities.slice(0, limit);

    return {
      entries: page.map((entity) => LedgerEntryMapper.toDomain(entity)),
      nextCursor: hasNextPage ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async findByWagerTransactionId(
    wagerTransactionId: string,
  ): Promise<LedgerEntry | null> {
    const entity = await this.em.findOne(LedgerEntryOrmEntity, {
      wagerTransactionId,
    });

    return entity ? LedgerEntryMapper.toDomain(entity) : null;
  }

  async save(entry: LedgerEntry): Promise<void> {
    const entity = LedgerEntryMapper.toPersistence(entry);

    this.em.persist(entity);
    await this.em.flush();
  }
}
