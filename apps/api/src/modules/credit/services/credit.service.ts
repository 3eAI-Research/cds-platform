import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the credit balance for a user.
   * Creates a Credit record with balance 0 if none exists (upsert).
   */
  async getBalance(userId: string): Promise<{ balance: number; userId: string }> {
    const credit = await this.prisma.credit.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });

    return { balance: credit.balance, userId: credit.userId };
  }

  /**
   * Deduct credits from a user's balance.
   *
   * ATOMIC: Uses Prisma interactive transaction to ensure
   * the balance check and update happen in the same DB transaction,
   * preventing race conditions.
   */
  async deductCredits(
    userId: string,
    amount: number,
    action: string,
    referenceId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Find credit record (lock row within transaction)
      const credit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!credit || credit.balance < amount) {
        throw new BusinessException(
          ErrorCode.BUS_INSUFFICIENT_CREDITS,
          `Insufficient credits. Required: ${amount}, available: ${credit?.balance ?? 0}`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // 2. Decrement balance
      const newBalance = credit.balance - amount;
      await tx.credit.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // 3. Create immutable ledger entry
      await tx.creditLedger.create({
        data: {
          userId,
          type: 'SPEND',
          amount: -amount,
          balanceAfter: newBalance,
          action,
          referenceId: referenceId ?? null,
        },
      });
    });
  }

  /**
   * Add credits to a user's balance.
   * Upserts the Credit record (creates if not exists).
   */
  async addCredits(
    userId: string,
    amount: number,
    type: string,
    action: string,
    referenceId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert credit record with incremented balance
      const credit = await tx.credit.upsert({
        where: { userId },
        update: { balance: { increment: amount } },
        create: { userId, balance: amount },
      });

      // 2. Create immutable ledger entry
      await tx.creditLedger.create({
        data: {
          userId,
          type,
          amount: +amount,
          balanceAfter: credit.balance,
          action,
          referenceId: referenceId ?? null,
        },
      });
    });
  }

  /**
   * Get paginated credit ledger transactions for a user.
   */
  async getTransactions(userId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.creditLedger.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
