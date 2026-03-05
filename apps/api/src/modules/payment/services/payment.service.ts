import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BusinessException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import { CommissionService } from '../../offer/services/commission.service';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  PaymentStatus,
} from '../dto/payment.dto';

/**
 * Payment transaction service — MVP manual record management.
 *
 * Status machine: PENDING → COMPLETED | FAILED | REFUNDED
 *
 * Phase 2: Stripe webhooks will drive status transitions automatically.
 * For now, endpoints allow manual status updates for testing the flow.
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Create a payment transaction record.
   * Commission is auto-calculated from totalAmount.
   */
  async create(
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    const commission = this.commissionService.calculate(dto.totalAmount);

    const payment = await this.prisma.paymentTransaction.create({
      data: {
        contractId: dto.contractId,
        demandId: dto.demandId,
        customerUserId: userId,
        providerUserId: userId, // MVP stub — will come from contract
        providerCompanyId: dto.providerCompanyId,
        type: dto.type,
        status: PaymentStatus.PENDING,
        totalAmount: dto.totalAmount,
        totalCurrency: dto.totalCurrency ?? 'EUR',
        commissionAmount: commission.commissionAmount,
        commissionRate: commission.commissionRate,
        providerNetAmount: commission.providerNetAmount,
        vatAmount: commission.vatAmount,
        vatRate: commission.vatRate,
        initiatedAt: new Date(),
        createdBy: userId,
      },
    });

    return this.toResponseDto(payment);
  }

  /**
   * Mark payment as COMPLETED.
   */
  async complete(
    id: string,
    stripePaymentIntentId?: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.findOrThrow(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessException(
        ErrorCode.BIZ_PAYMENT_ALREADY_COMPLETED,
        `Payment ${id} is ${payment.status}, cannot complete`,
      );
    }

    const updated = await this.prisma.paymentTransaction.update({
      where: { id },
      data: {
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
        stripePaymentIntentId: stripePaymentIntentId ?? null,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Mark payment as FAILED.
   */
  async fail(id: string): Promise<PaymentResponseDto> {
    const payment = await this.findOrThrow(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Payment ${id} is ${payment.status}, cannot mark as failed`,
      );
    }

    const updated = await this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: PaymentStatus.FAILED },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Mark payment as REFUNDED (only from COMPLETED).
   */
  async refund(id: string): Promise<PaymentResponseDto> {
    const payment = await this.findOrThrow(id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Payment ${id} is ${payment.status}, cannot refund`,
      );
    }

    const updated = await this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get payment by ID.
   */
  async findById(id: string): Promise<PaymentResponseDto> {
    const payment = await this.findOrThrow(id);
    return this.toResponseDto(payment);
  }

  /**
   * List payments with pagination and filters.
   */
  async findMany(params: {
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    contractId?: string;
  }) {
    const { page, pageSize, status, type, contractId } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (contractId) where.contractId = contractId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toResponseDto(p)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async findOrThrow(id: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('PaymentTransaction', id);
    }

    return payment;
  }

  private toResponseDto(payment: {
    id: string;
    contractId: string;
    demandId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    type: string;
    status: string;
    totalAmount: number;
    totalCurrency: string;
    commissionAmount: number;
    commissionRate: number;
    providerNetAmount: number;
    vatAmount: number;
    vatRate: number;
    initiatedAt: Date;
    completedAt: Date | null;
    transferredAt: Date | null;
    createdAt: Date;
  }): PaymentResponseDto {
    return {
      id: payment.id,
      contractId: payment.contractId,
      demandId: payment.demandId,
      customerUserId: payment.customerUserId,
      providerUserId: payment.providerUserId,
      providerCompanyId: payment.providerCompanyId,
      type: payment.type,
      status: payment.status,
      totalAmount: payment.totalAmount,
      totalCurrency: payment.totalCurrency,
      commissionAmount: payment.commissionAmount,
      commissionRate: payment.commissionRate,
      providerNetAmount: payment.providerNetAmount,
      vatAmount: payment.vatAmount,
      vatRate: payment.vatRate,
      initiatedAt: payment.initiatedAt.toISOString(),
      completedAt: payment.completedAt?.toISOString() ?? null,
      transferredAt: payment.transferredAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
