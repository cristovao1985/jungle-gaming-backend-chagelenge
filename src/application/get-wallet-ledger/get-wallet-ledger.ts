import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TRANSACTION_RUNNER } from "../ports/transaction-runner.token";
import type { TransactionRunner } from "../ports/transaction-runner";

export interface GetWalletLedgerInput {
  walletId: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class GetWalletLedger {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: GetWalletLedgerInput) {
    if (!input.walletId.trim()) {
      throw new Error("O ID da carteira é obrigatório");
    }

    const limit = input.limit ?? 50;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("O limite deve ser um inteiro entre 1 e 100");
    }

    return this.transactionRunner.run(async (ctx) => {
      const wallet = await ctx.walletRepository.findById(input.walletId);

      if (!wallet) {
        throw new NotFoundException("Carteira não encontrada.");
      }

      return ctx.ledgerEntryRepository.findByWalletId(input.walletId, {
        cursor: input.cursor,
        limit,
      });
    });
  }
}
