import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveLocalizedText } from './locale.helper';
import {
  VolumeEstimationItem,
  EstimateVolumeResponse,
  VolumeEstimationItemResult,
} from '../dto/estimate-volume.dto';

@Injectable()
export class VolumeCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estimate total volume for a list of furniture items.
   * POST /api/v1/transport/estimate-volume
   *
   * Core of the moving industry: Ladevolumen (loading volume)
   * determines truck size, crew size, and price.
   */
  async estimateVolume(
    items: VolumeEstimationItem[],
    locale: string,
  ): Promise<EstimateVolumeResponse> {
    const typeIds = items.map((i) => i.furnitureTypeId);

    const furnitureTypes = await this.prisma.furnitureType.findMany({
      where: { id: { in: typeIds } },
    });

    const typeMap = new Map(furnitureTypes.map((ft) => [ft.id, ft]));

    const resultItems: VolumeEstimationItemResult[] = [];
    let totalVolume = 0;

    for (const item of items) {
      const ft = typeMap.get(item.furnitureTypeId);
      if (!ft) continue; // Skip unknown furniture types

      const itemVolume = ft.volume * item.quantity;
      totalVolume += itemVolume;

      resultItems.push({
        furnitureTypeId: ft.id,
        name: resolveLocalizedText(ft.name, locale),
        quantity: item.quantity,
        unitVolume: ft.volume,
        totalVolume: Math.round(itemVolume * 100) / 100, // 2 decimal places
      });
    }

    return {
      totalVolume: Math.round(totalVolume * 100) / 100,
      itemCount: resultItems.length,
      items: resultItems,
    };
  }
}
