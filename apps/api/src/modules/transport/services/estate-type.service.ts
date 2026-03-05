import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveLocalizedText } from './locale.helper';
import {
  EstateTypeResponse,
  EstateTypeWithPartsResponse,
  EstatePartTypeResponse,
} from '../dto/estate-type.dto';

@Injectable()
export class EstateTypeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all active estate types.
   * GET /api/v1/estate-types
   */
  async findAll(locale: string): Promise<EstateTypeResponse[]> {
    const types = await this.prisma.estateType.findMany({
      where: { isActive: true },
    });

    return types.map((t) => ({
      id: t.id,
      name: resolveLocalizedText(t.name, locale),
      description: resolveLocalizedText(t.description, locale),
      isActive: t.isActive,
    }));
  }

  /**
   * Get estate type with its valid room/part types.
   * GET /api/v1/estate-types/:id/parts
   */
  async findWithParts(
    id: string,
    locale: string,
  ): Promise<EstateTypeWithPartsResponse | null> {
    const type = await this.prisma.estateType.findUnique({
      where: { id },
      include: {
        partTypeMappings: {
          include: { estatePartType: true },
          orderBy: { isMainType: 'desc' },
        },
      },
    });

    if (!type) return null;

    const partTypes: EstatePartTypeResponse[] = type.partTypeMappings.map(
      (m) => ({
        id: m.estatePartType.id,
        name: resolveLocalizedText(m.estatePartType.name, locale),
        description: resolveLocalizedText(m.estatePartType.description, locale),
        isActive: m.estatePartType.isActive,
        isOuterPart: m.estatePartType.isOuterPart,
      }),
    );

    return {
      id: type.id,
      name: resolveLocalizedText(type.name, locale),
      description: resolveLocalizedText(type.description, locale),
      isActive: type.isActive,
      partTypes,
    };
  }
}
