import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddressService } from '../../transport/services/address.service';
import { EstateService } from '../../transport/services/estate.service';
import { TransportationService } from '../../transport/services/transportation.service';
import { VolumeCalculatorService } from '../../transport/services/volume-calculator.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { NotFoundException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import {
  CreateDemandDto,
  LocationDto,
  DemandResponseDto,
} from '../dto/create-demand.dto';

const DEMAND_DEFAULT_EXPIRY_DAYS = 30;

@Injectable()
export class DemandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressService: AddressService,
    private readonly estateService: EstateService,
    private readonly transportationService: TransportationService,
    private readonly volumeCalculatorService: VolumeCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a demand (Umzugsanfrage) with full orchestration.
   *
   * Flow:
   * 1. Create from/to addresses (transport schema)
   * 2. Create from/to estates (transport schema)
   * 3. Create estate parts + furniture items (transport schema)
   * 4. Calculate estimated volume
   * 5. Create transportation record (transport schema)
   * 6. Create demand record (demand schema)
   * 7. Emit DEMAND_PUBLISHED event
   *
   * All DB operations run inside a single Prisma transaction.
   */
  async create(
    dto: CreateDemandDto,
    userId: string,
  ): Promise<DemandResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create addresses
      const fromAddress = await this.addressService.create(
        { ...dto.from.address, createdBy: userId },
        tx,
      );
      const toAddress = await this.addressService.create(
        { ...dto.to.address, createdBy: userId },
        tx,
      );

      // 2. Create estates
      const fromEstate = await this.createEstateWithParts(
        dto.from,
        fromAddress.id,
        userId,
        tx,
      );
      const toEstate = await this.createEstateWithParts(
        dto.to,
        toAddress.id,
        userId,
        tx,
      );

      // 3. Calculate estimated volume from "from" estate furniture
      const estimatedVolume = await this.calculateVolume(dto.from, tx);

      // 4. Create transportation record
      const transportation = await this.transportationService.create(
        {
          transportType: dto.transportType,
          fromEstateId: fromEstate.estateId,
          toEstateId: toEstate.estateId,
          fromAddressId: fromAddress.id,
          toAddressId: toAddress.id,
          numberOfPeople: dto.numberOfPeople,
          preferredDateStart: new Date(dto.preferredDateStart),
          preferredDateEnd: new Date(dto.preferredDateEnd),
          dateFlexibility: dto.dateFlexibility,
          estimatedVolume,
          createdBy: userId,
        },
        tx,
      );

      // 5. Create demand record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + DEMAND_DEFAULT_EXPIRY_DAYS);

      const demand = await tx.demand.create({
        data: {
          customerUserId: userId,
          status: 'PUBLISHED',
          serviceType: dto.serviceType,
          transportationId: transportation.id,
          additionalNotes: dto.additionalNotes ?? null,
          preferredLocale: dto.preferredLocale ?? 'de',
          expiresAt,
          createdBy: userId,
        },
      });

      return demand;
    });

    // 6. Emit event (outside transaction — fire-and-forget for MVP)
    this.eventEmitter.emit('demand.published', {
      eventId: crypto.randomUUID(),
      type: 'DEMAND_PUBLISHED',
      timestamp: new Date().toISOString(),
      sourceModule: 'demand',
      triggeredBy: userId,
      correlationId: result.id,
      payload: {
        demandId: result.id,
        customerUserId: userId,
        serviceType: result.serviceType,
        transportationId: result.transportationId,
        status: 'PUBLISHED',
      },
      idempotencyKey: `demand:${result.id}:published`,
    });

    return this.toResponseDto(result);
  }

  /**
   * Get a single demand by ID.
   */
  async findById(id: string): Promise<DemandResponseDto> {
    const demand = await this.prisma.demand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!demand) {
      throw new NotFoundException('Demand', id);
    }

    return this.toResponseDto(demand);
  }

  /**
   * List demands with pagination.
   * Supports filtering by status and customerUserId.
   */
  async findMany(params: {
    page: number;
    pageSize: number;
    status?: string;
    customerUserId?: string;
  }) {
    const { page, pageSize, status, customerUserId } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (customerUserId) where.customerUserId = customerUserId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.demand.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.demand.count({ where }),
    ]);

    return {
      items: items.map((d) => this.toResponseDto(d)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Cancel a demand.
   * Only the owning customer can cancel, and only if status allows.
   */
  async cancel(id: string, userId: string): Promise<DemandResponseDto> {
    const demand = await this.prisma.demand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!demand) {
      throw new NotFoundException('Demand', id);
    }

    if (demand.customerUserId !== userId) {
      throw new BusinessException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Only the demand owner can cancel',
        403,
      );
    }

    const cancellableStatuses = ['PUBLISHED', 'OFFERED'];
    if (!cancellableStatuses.includes(demand.status)) {
      throw new BusinessException(
        ErrorCode.BIZ_DEMAND_NOT_BIDDABLE,
        `Cannot cancel demand in status ${demand.status}`,
      );
    }

    const updated = await this.prisma.demand.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Emit cancellation event
    this.eventEmitter.emit('demand.cancelled', {
      eventId: crypto.randomUUID(),
      type: 'DEMAND_CANCELLED',
      timestamp: new Date().toISOString(),
      sourceModule: 'demand',
      triggeredBy: userId,
      correlationId: id,
      payload: {
        demandId: id,
        customerUserId: userId,
        previousStatus: demand.status,
        reason: 'USER_CANCELLED',
      },
      idempotencyKey: `demand:${id}:cancelled`,
    });

    return this.toResponseDto(updated);
  }

  // --- Private Helpers ---

  /**
   * Create an estate with its parts and furniture items.
   * Returns { estateId } for use in transportation creation.
   */
  private async createEstateWithParts(
    location: LocationDto,
    addressId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const estate = await this.estateService.create(
      {
        estateTypeId: location.estate.estateTypeId,
        addressId,
        totalSquareMeters: location.estate.totalSquareMeters,
        numberOfFloors: location.estate.numberOfFloors,
        numberOfRooms: location.estate.numberOfRooms,
        elevatorType: location.estate.elevatorType,
        walkingWayMeters: location.estate.walkingWayMeters,
        halteverbotRequired: location.estate.halteverbotRequired,
        furnitureMontage: location.estate.furnitureMontage,
        kitchenMontage: location.estate.kitchenMontage,
        packingService: location.estate.packingService,
        hasCellar: location.estate.hasCellar,
        cellarSquareMeters: location.estate.cellarSquareMeters,
        hasLoft: location.estate.hasLoft,
        loftSquareMeters: location.estate.loftSquareMeters,
        hasGardenGarage: location.estate.hasGardenGarage,
        gardenGarageSquareMeters: location.estate.gardenGarageSquareMeters,
        createdBy: userId,
      },
      tx,
    );

    // Create parts with furniture
    for (const partDto of location.estate.parts) {
      const part = await this.estateService.addPart(
        {
          estateId: estate.id,
          estatePartTypeId: partDto.estatePartTypeId,
          customName: partDto.customName,
        },
        tx,
      );

      for (const itemDto of partDto.furnitureItems) {
        await this.estateService.addFurnitureItem(
          {
            estatePartId: part.id,
            furnitureTypeId: itemDto.furnitureTypeId,
            quantity: itemDto.quantity,
          },
          tx,
        );
      }
    }

    return { estateId: estate.id };
  }

  /**
   * Calculate estimated volume from the "from" location's furniture items.
   * Uses VolumeCalculatorService (reads furniture types from DB).
   */
  private async calculateVolume(
    fromLocation: LocationDto,
    _tx: unknown,
  ): Promise<number> {
    const allItems: { furnitureTypeId: string; quantity: number }[] = [];

    for (const part of fromLocation.estate.parts) {
      for (const item of part.furnitureItems) {
        allItems.push({
          furnitureTypeId: item.furnitureTypeId,
          quantity: item.quantity,
        });
      }
    }

    if (allItems.length === 0) return 0;

    const result = await this.volumeCalculatorService.estimateVolume(
      allItems,
      'de',
    );
    return result.totalVolume;
  }

  private toResponseDto(demand: {
    id: string;
    status: string;
    serviceType: string;
    transportationId: string;
    customerUserId: string;
    offerCount: number;
    preferredLocale: string;
    additionalNotes: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): DemandResponseDto {
    return {
      id: demand.id,
      status: demand.status,
      serviceType: demand.serviceType,
      transportationId: demand.transportationId,
      customerUserId: demand.customerUserId,
      offerCount: demand.offerCount,
      preferredLocale: demand.preferredLocale,
      additionalNotes: demand.additionalNotes,
      expiresAt: demand.expiresAt?.toISOString() ?? null,
      createdAt: demand.createdAt.toISOString(),
      updatedAt: demand.updatedAt.toISOString(),
    };
  }
}
