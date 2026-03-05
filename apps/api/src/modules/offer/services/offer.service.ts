import { Injectable, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommissionService } from './commission.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { NotFoundException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import { CreateOfferDto, OfferResponseDto } from '../dto/create-offer.dto';

@Injectable()
export class OfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submit an offer for a demand.
   *
   * Business rules:
   * - Demand must exist and be in PUBLISHED status
   * - Provider cannot submit duplicate offers for the same demand
   * - Commission is calculated server-side
   */
  async submit(
    dto: CreateOfferDto,
    userId: string,
  ): Promise<OfferResponseDto> {
    // 1. Check demand is biddable (cross-schema: read-only check)
    const demand = await this.prisma.demand.findFirst({
      where: { id: dto.demandId, deletedAt: null },
    });

    if (!demand) {
      throw new NotFoundException('Demand', dto.demandId);
    }

    const biddableStatuses = ['PUBLISHED', 'OFFERED'];
    if (!biddableStatuses.includes(demand.status)) {
      throw new BusinessException(
        ErrorCode.BIZ_DEMAND_NOT_BIDDABLE,
        `Demand is in status ${demand.status}, not accepting offers`,
      );
    }

    if (demand.expiresAt && demand.expiresAt < new Date()) {
      throw new BusinessException(
        ErrorCode.BIZ_DEMAND_EXPIRED,
        'Demand has expired',
      );
    }

    // 2. Check for duplicate offer
    const existingOffer = await this.prisma.offer.findFirst({
      where: {
        demandId: dto.demandId,
        providerCompanyId: dto.providerCompanyId,
        deletedAt: null,
        status: { notIn: ['WITHDRAWN', 'EXPIRED'] },
      },
    });

    if (existingOffer) {
      throw new BusinessException(
        ErrorCode.BIZ_DUPLICATE_OFFER,
        'Provider already has an active offer for this demand',
        HttpStatus.CONFLICT,
      );
    }

    // 3. Calculate commission
    const commission = this.commissionService.calculate(dto.totalPriceAmount);

    // 4. Create offer
    const offer = await this.prisma.offer.create({
      data: {
        demandId: dto.demandId,
        providerUserId: userId,
        providerCompanyId: dto.providerCompanyId,
        status: 'SUBMITTED',
        totalPriceAmount: commission.totalPriceAmount,
        totalPriceCurrency: 'EUR',
        commissionAmount: commission.commissionAmount,
        commissionRate: commission.commissionRate,
        providerNetAmount: commission.providerNetAmount,
        vatAmount: commission.vatAmount,
        vatRate: commission.vatRate,
        message: dto.message ?? null,
        validUntil: new Date(dto.validUntil),
        priceBreakdown: dto.priceBreakdown ?? Prisma.JsonNull,
        submittedAt: new Date(),
        createdBy: userId,
      },
    });

    // 5. Emit OFFER_SUBMITTED event
    this.eventEmitter.emit('offer.submitted', {
      eventId: crypto.randomUUID(),
      type: 'OFFER_SUBMITTED',
      timestamp: new Date().toISOString(),
      sourceModule: 'offer',
      triggeredBy: userId,
      correlationId: offer.id,
      payload: {
        offerId: offer.id,
        demandId: dto.demandId,
        providerCompanyId: dto.providerCompanyId,
        totalPriceAmount: commission.totalPriceAmount,
        commissionAmount: commission.commissionAmount,
      },
      idempotencyKey: `offer:${offer.id}:submitted`,
    });

    return this.toResponseDto(offer);
  }

  /**
   * Accept an offer (by the demand owner / customer).
   *
   * Business rules:
   * - Only demand owner can accept
   * - Offer must be in SUBMITTED status
   * - Only one offer can be accepted per demand
   */
  async accept(
    offerId: string,
    userId: string,
  ): Promise<OfferResponseDto> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
    });

    if (!offer) {
      throw new NotFoundException('Offer', offerId);
    }

    if (offer.status !== 'SUBMITTED') {
      throw new BusinessException(
        ErrorCode.BIZ_OFFER_ALREADY_ACCEPTED,
        `Offer is in status ${offer.status}, cannot accept`,
      );
    }

    // Verify demand ownership
    const demand = await this.prisma.demand.findFirst({
      where: { id: offer.demandId, deletedAt: null },
    });

    if (!demand || demand.customerUserId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only the demand owner can accept offers',
        403,
      );
    }

    // Check no other offer is already accepted for this demand
    const existingAccepted = await this.prisma.offer.findFirst({
      where: {
        demandId: offer.demandId,
        status: 'ACCEPTED',
        deletedAt: null,
      },
    });

    if (existingAccepted) {
      throw new BusinessException(
        ErrorCode.BIZ_OFFER_ALREADY_ACCEPTED,
        'Another offer is already accepted for this demand',
      );
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED' },
    });

    // Emit OFFER_ACCEPTED event
    this.eventEmitter.emit('offer.accepted', {
      eventId: crypto.randomUUID(),
      type: 'OFFER_ACCEPTED',
      timestamp: new Date().toISOString(),
      sourceModule: 'offer',
      triggeredBy: userId,
      correlationId: offerId,
      payload: {
        offerId,
        demandId: offer.demandId,
        providerCompanyId: offer.providerCompanyId,
        providerUserId: offer.providerUserId,
        customerUserId: demand.customerUserId,
        totalPriceAmount: offer.totalPriceAmount,
        commissionAmount: offer.commissionAmount,
        vatAmount: offer.vatAmount,
      },
      idempotencyKey: `offer:${offerId}:accepted`,
    });

    return this.toResponseDto(updated);
  }

  /**
   * Reject an offer (by the demand owner / customer).
   */
  async reject(
    offerId: string,
    userId: string,
  ): Promise<OfferResponseDto> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
    });

    if (!offer) {
      throw new NotFoundException('Offer', offerId);
    }

    if (offer.status !== 'SUBMITTED') {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Offer is in status ${offer.status}, cannot reject`,
      );
    }

    // Verify demand ownership
    const demand = await this.prisma.demand.findFirst({
      where: { id: offer.demandId, deletedAt: null },
    });

    if (!demand || demand.customerUserId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only the demand owner can reject offers',
        403,
      );
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'REJECTED' },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Withdraw an offer (by the provider who submitted it).
   */
  async withdraw(
    offerId: string,
    userId: string,
  ): Promise<OfferResponseDto> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
    });

    if (!offer) {
      throw new NotFoundException('Offer', offerId);
    }

    if (offer.providerUserId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only the offer owner can withdraw',
        403,
      );
    }

    if (offer.status !== 'SUBMITTED') {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Offer is in status ${offer.status}, cannot withdraw`,
      );
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'WITHDRAWN' },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get a single offer by ID.
   */
  async findById(id: string): Promise<OfferResponseDto> {
    const offer = await this.prisma.offer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!offer) {
      throw new NotFoundException('Offer', id);
    }

    return this.toResponseDto(offer);
  }

  /**
   * List offers with pagination and filters.
   */
  async findMany(params: {
    page: number;
    pageSize: number;
    demandId?: string;
    status?: string;
    providerCompanyId?: string;
  }) {
    const { page, pageSize, demandId, status, providerCompanyId } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null };
    if (demandId) where.demandId = demandId;
    if (status) where.status = status;
    if (providerCompanyId) where.providerCompanyId = providerCompanyId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.offer.count({ where }),
    ]);

    return {
      items: items.map((o) => this.toResponseDto(o)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // --- Private Helpers ---

  private toResponseDto(offer: {
    id: string;
    demandId: string;
    providerUserId: string;
    providerCompanyId: string;
    status: string;
    totalPriceAmount: number;
    totalPriceCurrency: string;
    commissionAmount: number;
    commissionRate: number;
    providerNetAmount: number;
    vatAmount: number;
    vatRate: number;
    message: string | null;
    validUntil: Date;
    priceBreakdown: unknown;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OfferResponseDto {
    return {
      id: offer.id,
      demandId: offer.demandId,
      providerUserId: offer.providerUserId,
      providerCompanyId: offer.providerCompanyId,
      status: offer.status,
      totalPriceAmount: offer.totalPriceAmount,
      totalPriceCurrency: offer.totalPriceCurrency,
      commissionAmount: offer.commissionAmount,
      commissionRate: offer.commissionRate,
      providerNetAmount: offer.providerNetAmount,
      vatAmount: offer.vatAmount,
      vatRate: offer.vatRate,
      message: offer.message,
      validUntil: offer.validUntil.toISOString(),
      priceBreakdown: offer.priceBreakdown as Record<string, unknown> | null,
      submittedAt: offer.submittedAt?.toISOString() ?? null,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
    };
  }
}
