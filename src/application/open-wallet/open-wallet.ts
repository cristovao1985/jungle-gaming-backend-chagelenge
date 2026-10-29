import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";

import { Money } from "../../domain/money/money";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { WagerTransaction } from "../../domain/wager-transaction/wager-transaction.entity";
import { WagerTransactionType } from "../../domain/wager-transaction/wager-transaction.type";
import { LedgerEntry } from "../../domain/ledger-entry/ledger-entry.entity";
import { LedgerEntryDirection } from "../../domain/ledger-entry/ledger-entry-direction";

import { TRANSACTION_RUNNER } from "../ports/transaction-runner.token";
import type { TransactionRunner } from "../ports/transaction-runner";
import { isCurrencyCode } from "../../enum/curreny";

export interface OpenWalletInput {
  playerId: string;
  currency: string;
  initialBalance: string;
}

@Injectable()
export class OpenWallet {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: OpenWalletInput) {
    if (!input.playerId.trim()) {
      throw new Error("O ID do jogador é obrigatório.");
    }

    if (!isCurrencyCode(input.currency)) {
      throw new Error("A moeda informada não é suportada.");
    }

    const initialBalance = Money.from(input.initialBalance);

    if (initialBalance.isNegative() || initialBalance.isZero()) {
      throw new Error("O saldo inicial deve ser maior que zero.");
    }

    const walletId = randomUUID();
    const transactionId = randomUUID();
    const now = new Date();

    return this.transactionRunner.run(async (context) => {
      const existingWallet =
        await context.walletRepository.findByPlayerIdAndCurrency(
          input.playerId,
          input.currency,
        );

      if (existingWallet) {
        throw new Error("Já existe uma carteira para este jogador e moeda.");
      }

      const wallet = Wallet.create(
        walletId,
        input.playerId,
        input.currency as Parameters<typeof Wallet.create>[2],
        initialBalance,
      );

      const openingTransaction = WagerTransaction.createNewOpening(
        {
          id: transactionId,
          providerId: "INTERNAL",
          playerId: input.playerId,
          walletId,
          externalTransactionId: `opening:${walletId}`,
          idempontencyKey: `opening:${walletId}`,
          type: WagerTransactionType.OPENING,
          amount: initialBalance,
          currency: input.currency as Parameters<typeof Wallet.create>[2],
          payloadHash: `opening:${walletId}`,
          createdAt: now,
        },
        now,
      );

      await context.walletRepository.save(wallet);
      await context.wagerTransactionRepository.save(openingTransaction);

      const ledgerEntry = LedgerEntry.create({
        id: randomUUID(),
        walletId,
        wagerTransactionId: transactionId,
        direction: LedgerEntryDirection.CREDIT,
        amount: initialBalance,
        currency: input.currency as Parameters<typeof Wallet.create>[2],
        createdAt: now,
      });

      await context.ledgerEntryRepository.save(ledgerEntry);

      return {
        walletId: wallet.id,
        playerId: wallet.playerId,
        currency: wallet.currency,
        balance: wallet.balance.toString(),
        version: wallet.version,
        openingTransactionId: transactionId,
      };
    });
  }
}
