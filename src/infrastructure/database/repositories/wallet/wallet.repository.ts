import type { Wallet } from "../../../../domain/wallet/wallet.entity"; 

export interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;

  findByPlayerIdAndCurrency(
    playerId: string,
    currency: Wallet["currency"],
  ): Promise<Wallet | null>;

  save(wallet: Wallet, expectedVersion?: number): Promise<void>;
}
