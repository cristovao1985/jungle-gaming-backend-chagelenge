import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from "@nestjs/common";
import type { WagerTransactionType } from "../../domain/wager-transaction/wager-transaction.type";
import type { CurrencyCode } from "../../enum/curreny";
import { ProcessWagerTransaction } from "../../application/process-wager-transaction/process-wager-transaction";
import { FailureErrors } from "../../enum/errors";
import { createHash, randomUUID } from "node:crypto";
import { Money } from "../../domain/money/money";

interface CreateWagerTransactionBody {
  providerId: string;
  playerId: string;
  walletId: string;
  externalTransactionId: string;
  type: WagerTransactionType;
  amount: string;
  currency: CurrencyCode;
  roundId?: string;
  referenceExternalTransactionId?: string;
}

@Controller("wagering/transactions")
export class WageringController {
  constructor(
    @Inject(ProcessWagerTransaction)
    private readonly processWagerTransaction: ProcessWagerTransaction,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateWagerTransactionBody,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        code: FailureErrors.IDEMPOTENCY_KEY_REQUIRED,
        message: "O cabeçalho Idempotency-Key é obrigatório",
      });
    }

    if (
      !body ||
      !body.providerId ||
      !body.playerId ||
      !body.walletId ||
      !body.externalTransactionId ||
      !body.type ||
      !body.amount ||
      !body.currency
    ) {
      throw new BadRequestException({
        code: FailureErrors.INVALID_WAGER_REQUEST,
        message: "Campos obrigatórios da transação não informados.",
      });
    }

    const normalizedPayload = {
      providerId: body.providerId.trim(),
      playerId: body.playerId.trim(),
      walletId: body.walletId.trim(),
      externalTransactionId: body.externalTransactionId.trim(),
      type: body.type,
      amount: Money.from(body.amount).toString(),
      currency: body.currency,
      roundId: body.roundId?.trim() ?? null,
      referenceExternalTransactionId:
        body.referenceExternalTransactionId?.trim() ?? null,
    };

    const payloadHash = createHash("sha256")
      .update(JSON.stringify(normalizedPayload))
      .digest("hex");

    try {
      return await this.processWagerTransaction.execute({
        id: randomUUID(),
        providerId: body.providerId,
        playerId: body.playerId,
        walletId: body.walletId,
        externalTransactionId: body.externalTransactionId,
        idempontencyKey: idempotencyKey.trim(),
        type: body.type,
        amount: body.amount,
        currency: body.currency,
        roundId: body.roundId,
        referenceExternalTransactionId: body.referenceExternalTransactionId,
        payloadHash,
      });
    } catch (error: unknown) {
      if (!(error instanceof Error)) {
        throw error;
      }

      if (error.message.includes("chave de idempotência")) {
        throw new ConflictException({
          code: FailureErrors.IDEMPOTENCY_KEY_CONFLICT,
          message: error.message,
        });
      }

      if (error.message.includes("já existe")) {
        throw new ConflictException({
          code: FailureErrors.WAGER_TRANSACTION_CONFLICT,
          message: error.message,
        });
      }

      throw new BadRequestException({
        code: FailureErrors.INVALID_WAGER_REQUEST,
        message: error.message,
      });
    }
  }
}
