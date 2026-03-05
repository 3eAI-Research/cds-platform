import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveLocalizedText } from './locale.helper';
import {
  FurnitureGroupResponse,
  FurnitureTypeResponse,
} from '../dto/furniture-type.dto';

@Injectable()
export class FurnitureTypeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all furniture groups with their furniture types.
   * GET /api/v1/furniture-groups
   */
  async findAllGroups(locale: string): Promise<FurnitureGroupResponse[]> {
    const groups = await this.prisma.furnitureGroupType.findMany({
      where: { isActive: true },
      include: {
        furnitureTypes: {
          where: { isActive: true },
        },
      },
    });

    return groups
      .map((g) => ({
        id: g.id,
        name: resolveLocalizedText(g.name, locale),
        description: resolveLocalizedText(g.description, locale),
        furnitureTypes: g.furnitureTypes
          .map((ft) => this.mapFurnitureType(ft, locale))
          .sort((a, b) => a.name.localeCompare(b.name, locale)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }

  /**
   * List all furniture types (flat, without grouping).
   * GET /api/v1/furniture-types
   */
  async findAll(locale: string): Promise<FurnitureTypeResponse[]> {
    const types = await this.prisma.furnitureType.findMany({
      where: { isActive: true },
    });

    // Sort by localized name in application layer — JSON fields can't be reliably sorted in DB
    return types
      .map((ft) => this.mapFurnitureType(ft, locale))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }

  private mapFurnitureType(
    ft: {
      id: string;
      name: unknown;
      description: unknown;
      volume: number;
      assemblable: boolean;
      disassembleCost: number | null;
      assembleCost: number | null;
      flatRate: number | null;
      calculationType: string;
    },
    locale: string,
  ): FurnitureTypeResponse {
    return {
      id: ft.id,
      name: resolveLocalizedText(ft.name, locale),
      description: resolveLocalizedText(ft.description, locale),
      volume: ft.volume,
      assemblable: ft.assemblable,
      disassembleCost: ft.disassembleCost ?? undefined,
      assembleCost: ft.assembleCost ?? undefined,
      flatRate: ft.flatRate ?? undefined,
      calculationType: ft.calculationType,
    };
  }
}
