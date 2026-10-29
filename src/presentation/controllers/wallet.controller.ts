import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  OpenWallet,
  type OpenWalletInput,
} from "../../application/open-wallet/open-wallet";
import { GetWallet } from "../../application/get-wallet/get-wallet";
import { GetWalletLedger } from "../../application/get-wallet-ledger/get-wallet-ledger";

@Controller("wallets")
export class WalletController {
  constructor(
    private readonly openWallet: OpenWallet,
    @Inject(GetWallet)
    private readonly getWallet: GetWallet,
    @Inject(GetWalletLedger)
    private readonly getWalletLedger: GetWalletLedger,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(@Body() body: OpenWalletInput) {
    try {
      return await this.openWallet.execute(body);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      if (error.message.includes("Já existe uma carteira")) {
        throw new ConflictException({
          message: error.message,
          code: "WALLET_ALREADY_EXISTS",
        });
      }

      throw new BadRequestException({
        message: error.message,
        code: "INVALID_WALLET_REQUEST",
      });
    }
  }

  @Get(":walletId")
  async getWalletById(@Param("walletId") walletId: string) {
    return this.getWallet.execute(walletId);
  }

  @Get(":walletId/ledger")
  async getWalletLedgerByWalletId(
    @Param("walletId") walletId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit === undefined ? 50 : Number(limit);
    return this.getWalletLedger.execute({
      walletId,
      cursor,
      limit: parsedLimit,
    });
  }
}
