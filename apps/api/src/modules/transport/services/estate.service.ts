import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateEstateInput {
  estateTypeId: string;
  addressId: string;
  totalSquareMeters: number;
  numberOfFloors?: number;
  numberOfRooms: number;
  elevatorType?: string;
  walkingWayMeters?: number;
  halteverbotRequired?: boolean;
  furnitureMontage?: boolean;
  kitchenMontage?: boolean;
  packingService?: boolean;
  hasCellar?: boolean;
  cellarSquareMeters?: number;
  hasLoft?: boolean;
  loftSquareMeters?: number;
  hasGardenGarage?: boolean;
  gardenGarageSquareMeters?: number;
  createdBy: string;
}

export interface AddEstatePartInput {
  estateId: string;
  estatePartTypeId: string;
  customName?: string;
}

export interface AddFurnitureItemInput {
  estatePartId: string;
  furnitureTypeId: string;
  quantity: number;
  calculatedVolume?: number;
}

@Injectable()
export class EstateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an estate (property being moved from/to).
   * Called by Demand module during demand creation.
   */
  async create(
    input: CreateEstateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.estate.create({
      data: {
        estateTypeId: input.estateTypeId,
        addressId: input.addressId,
        totalSquareMeters: input.totalSquareMeters,
        numberOfFloors: input.numberOfFloors ?? 1,
        numberOfRooms: input.numberOfRooms,
        elevatorType: input.elevatorType ?? 'NONE',
        walkingWayMeters: input.walkingWayMeters ?? 0,
        halteverbotRequired: input.halteverbotRequired ?? false,
        furnitureMontage: input.furnitureMontage ?? false,
        kitchenMontage: input.kitchenMontage ?? false,
        packingService: input.packingService ?? false,
        hasCellar: input.hasCellar ?? false,
        cellarSquareMeters: input.cellarSquareMeters ?? null,
        hasLoft: input.hasLoft ?? false,
        loftSquareMeters: input.loftSquareMeters ?? null,
        hasGardenGarage: input.hasGardenGarage ?? false,
        gardenGarageSquareMeters: input.gardenGarageSquareMeters ?? null,
        createdBy: input.createdBy,
      },
    });
  }

  /**
   * Add a room/part to an estate.
   */
  async addPart(
    input: AddEstatePartInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.estatePart.create({
      data: {
        estateId: input.estateId,
        estatePartTypeId: input.estatePartTypeId,
        customName: input.customName ?? null,
      },
    });
  }

  /**
   * Add a furniture item to a room/part.
   */
  async addFurnitureItem(
    input: AddFurnitureItemInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.furnitureItem.create({
      data: {
        estatePartId: input.estatePartId,
        furnitureTypeId: input.furnitureTypeId,
        quantity: input.quantity,
        calculatedVolume: input.calculatedVolume ?? null,
      },
    });
  }
}
