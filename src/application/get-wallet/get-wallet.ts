import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { TRANSACTION_RUNNER } from "../ports/transaction-runner.token";
import type { TransactionRunner } from "../ports/transaction-runner";
import { Money } from "../../domain/money/money";

export interface GetWalletOutput {
  walletId: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
}

@Injectable()
export class GetWallet {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(walletId: string): Promise<GetWalletOutput> {
    if (!walletId.trim()) {
      throw new Error("O ID da carteira é obrigatório");
    }

    return this.transactionRunner.run(async (ctx) => {
      const wallet = await ctx.walletRepository.findById(walletId);
      if (!wallet) {
        throw new NotFoundException("Carteira não encontrada");
      }

      return {
        walletId: wallet.id,
        playerId: wallet.playerId,
        currency: wallet.currency,
        balance: Money.from(wallet.balance.toString()),
        version: wallet.version,
      };
    });
  }
}
