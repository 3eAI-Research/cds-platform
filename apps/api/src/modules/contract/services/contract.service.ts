import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { NotFoundException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import { ContractResponseDto } from '../dto/contract.dto';

/**
 * Contract service — digital service contracts (Dienstleistungsvertrag).
 *
 * Status machine:
 *   DRAFT → PENDING_CUSTOMER → PENDING_PROVIDER → ACTIVE
 *   Any state → CANCELLED
 *
 * Flow:
 *   1. OFFER_ACCEPTED event → auto-create DRAFT contract
 *   2. Customer accepts → PENDING_PROVIDER (or ACTIVE if provider accepted first)
 *   3. Provider accepts → ACTIVE (or PENDING_CUSTOMER if customer hasn't accepted)
 *   4. Both accepted → ACTIVE (triggers CONTRACT_ACTIVE event)
 */
@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a contract draft from an accepted offer.
   * Called by event handler (OFFER_ACCEPTED).
   */
  async createFromOffer(params: {
    demandId: string;
    offerId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    totalPriceAmount: number;
    commissionAmount: number;
    vatAmount: number;
    serviceDate: Date;
    serviceDescription: string;
    createdBy: string;
  }): Promise<ContractResponseDto> {
    const contract = await this.prisma.contract.create({
      data: {
        demandId: params.demandId,
        offerId: params.offerId,
        customerUserId: params.customerUserId,
        providerUserId: params.providerUserId,
        providerCompanyId: params.providerCompanyId,
        status: 'DRAFT',
        agreedPriceAmount: params.totalPriceAmount,
        agreedPriceCurrency: 'EUR',
        commissionAmount: params.commissionAmount,
        commissionCurrency: 'EUR',
        vatAmount: params.vatAmount,
        vatCurrency: 'EUR',
        serviceDate: params.serviceDate,
        serviceDescription: params.serviceDescription,
        createdBy: params.createdBy,
      },
    });

    this.eventEmitter.emit('contract.created', {
      eventId: crypto.randomUUID(),
      type: 'CONTRACT_CREATED',
      timestamp: new Date().toISOString(),
      sourceModule: 'contract',
      triggeredBy: params.createdBy,
      correlationId: contract.id,
      payload: {
        contractId: contract.id,
        demandId: params.demandId,
        offerId: params.offerId,
        customerUserId: params.customerUserId,
        providerCompanyId: params.providerCompanyId,
      },
      idempotencyKey: `contract:${contract.id}:created`,
    });

    return this.toResponseDto(contract);
  }

  /**
   * Customer accepts the contract.
   */
  async customerAccept(
    contractId: string,
    userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.findOrThrow(contractId);

    if (contract.customerUserId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only the customer can accept this contract',
        403,
      );
    }

    if (contract.customerAcceptedAt) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        'Customer has already accepted this contract',
      );
    }

    const acceptableStatuses = ['DRAFT', 'PENDING_CUSTOMER'];
    if (!acceptableStatuses.includes(contract.status)) {
      throw new BusinessException(
        ErrorCode.BIZ_CONTRACT_NOT_SIGNABLE,
        `Contract is in status ${contract.status}, cannot accept`,
      );
    }

    // Determine new status
    const newStatus = contract.providerAcceptedAt ? 'ACTIVE' : 'PENDING_PROVIDER';

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        customerAcceptedAt: new Date(),
        status: newStatus,
      },
    });

    if (newStatus === 'ACTIVE') {
      this.emitContractActive(updated);
    }

    return this.toResponseDto(updated);
  }

  /**
   * Provider accepts the contract.
   */
  async providerAccept(
    contractId: string,
    userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.findOrThrow(contractId);

    if (contract.providerUserId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only the provider can accept this contract',
        403,
      );
    }

    if (contract.providerAcceptedAt) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        'Provider has already accepted this contract',
      );
    }

    const acceptableStatuses = ['DRAFT', 'PENDING_PROVIDER'];
    if (!acceptableStatuses.includes(contract.status)) {
      throw new BusinessException(
        ErrorCode.BIZ_CONTRACT_NOT_SIGNABLE,
        `Contract is in status ${contract.status}, cannot accept`,
      );
    }

    const newStatus = contract.customerAcceptedAt ? 'ACTIVE' : 'PENDING_CUSTOMER';

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        providerAcceptedAt: new Date(),
        status: newStatus,
      },
    });

    if (newStatus === 'ACTIVE') {
      this.emitContractActive(updated);
    }

    return this.toResponseDto(updated);
  }

  /**
   * Cancel a contract.
   */
  async cancel(
    contractId: string,
    userId: string,
    reason?: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.findOrThrow(contractId);

    // Only parties to the contract can cancel
    if (
      contract.customerUserId !== userId &&
      contract.providerUserId !== userId
    ) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only contract parties can cancel',
        403,
      );
    }

    if (contract.status === 'CANCELLED') {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        'Contract is already cancelled',
      );
    }

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'CANCELLED',
        cancelledBy: userId,
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get a single contract by ID.
   */
  async findById(id: string): Promise<ContractResponseDto> {
    const contract = await this.findOrThrow(id);
    return this.toResponseDto(contract);
  }

  /**
   * List contracts for a user (as customer or provider).
   */
  async findByUser(params: {
    userId: string;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    const { userId, page, pageSize, status } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ customerUserId: userId }, { providerUserId: userId }],
    };
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      items: items.map((c) => this.toResponseDto(c)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // --- Private Helpers ---

  private async findOrThrow(id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
    });

    if (!contract) {
      throw new NotFoundException('Contract', id);
    }

    return contract;
  }

  private emitContractActive(contract: {
    id: string;
    demandId: string;
    offerId: string;
    customerUserId: string;
    providerCompanyId: string;
  }) {
    this.eventEmitter.emit('contract.active', {
      eventId: crypto.randomUUID(),
      type: 'CONTRACT_ACTIVE',
      timestamp: new Date().toISOString(),
      sourceModule: 'contract',
      triggeredBy: 'system',
      correlationId: contract.id,
      payload: {
        contractId: contract.id,
        demandId: contract.demandId,
        offerId: contract.offerId,
        customerUserId: contract.customerUserId,
        providerCompanyId: contract.providerCompanyId,
      },
      idempotencyKey: `contract:${contract.id}:active`,
    });
  }

  private toResponseDto(contract: {
    id: string;
    demandId: string;
    offerId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    status: string;
    agreedPriceAmount: number;
    agreedPriceCurrency: string;
    commissionAmount: number;
    vatAmount: number;
    serviceDate: Date;
    serviceDescription: string;
    customerAcceptedAt: Date | null;
    providerAcceptedAt: Date | null;
    pdfStorageKey: string | null;
    pdfGeneratedAt: Date | null;
    cancelledBy: string | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContractResponseDto {
    return {
      id: contract.id,
      demandId: contract.demandId,
      offerId: contract.offerId,
      customerUserId: contract.customerUserId,
      providerUserId: contract.providerUserId,
      providerCompanyId: contract.providerCompanyId,
      status: contract.status,
      agreedPriceAmount: contract.agreedPriceAmount,
      agreedPriceCurrency: contract.agreedPriceCurrency,
      commissionAmount: contract.commissionAmount,
      vatAmount: contract.vatAmount,
      serviceDate: contract.serviceDate.toISOString(),
      serviceDescription: contract.serviceDescription,
      customerAcceptedAt: contract.customerAcceptedAt?.toISOString() ?? null,
      providerAcceptedAt: contract.providerAcceptedAt?.toISOString() ?? null,
      pdfStorageKey: contract.pdfStorageKey,
      pdfGeneratedAt: contract.pdfGeneratedAt?.toISOString() ?? null,
      cancelledBy: contract.cancelledBy,
      cancelledAt: contract.cancelledAt?.toISOString() ?? null,
      cancellationReason: contract.cancellationReason,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
    };
  }
}
