import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAddressInput {
  street: string;
  houseNumber: string;
  postCode: string;
  placeName: string;
  countryCode?: string;
  additionalInfo?: string;
  floor?: number;
  createdBy: string;
}

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a physical address.
   * Called by Demand module during demand creation (from/to addresses).
   *
   * Accepts optional Prisma transaction client for atomic operations.
   */
  async create(
    input: CreateAddressInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.address.create({
      data: {
        street: input.street,
        houseNumber: input.houseNumber,
        postCode: input.postCode,
        placeName: input.placeName,
        countryCode: input.countryCode ?? 'DE',
        additionalInfo: input.additionalInfo ?? null,
        floor: input.floor ?? null,
        createdBy: input.createdBy,
      },
    });
  }
}
