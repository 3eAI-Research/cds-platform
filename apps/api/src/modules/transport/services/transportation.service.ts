import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateTransportationInput {
  transportType: string;
  fromEstateId: string;
  toEstateId: string;
  fromAddressId: string;
  toAddressId: string;
  numberOfPeople: number;
  preferredDateStart: Date;
  preferredDateEnd: Date;
  dateFlexibility?: boolean;
  estimatedVolume?: number;
  estimatedDistanceKm?: number;
  additionalInfo?: string;
  createdBy: string;
}

@Injectable()
export class TransportationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a transportation record.
   * Called by Demand module during demand creation.
   */
  async create(
    input: CreateTransportationInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.transportation.create({
      data: {
        transportType: input.transportType,
        status: 'PLANNED',
        fromEstateId: input.fromEstateId,
        toEstateId: input.toEstateId,
        fromAddressId: input.fromAddressId,
        toAddressId: input.toAddressId,
        numberOfPeople: input.numberOfPeople,
        preferredDateStart: input.preferredDateStart,
        preferredDateEnd: input.preferredDateEnd,
        dateFlexibility: input.dateFlexibility ?? false,
        estimatedVolume: input.estimatedVolume ?? 0,
        estimatedDistanceKm: input.estimatedDistanceKm ?? 0,
        additionalInfo: input.additionalInfo ?? null,
        createdBy: input.createdBy,
      },
    });
  }
}
