import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PostCodeResponse } from '../dto/post-code.dto';

@Injectable()
export class PostCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lookup post code(s) by prefix.
   * GET /api/v1/post-codes/:code
   *
   * Supports exact (5-digit) and prefix (2-4 digit) lookups.
   * Used by frontend for autocomplete on PLZ input.
   */
  async findByCode(code: string): Promise<PostCodeResponse[]> {
    const postCodes = await this.prisma.postCode.findMany({
      where: {
        postCode: { startsWith: code },
        countryCode: 'DE',
      },
      take: 20, // Limit results for prefix searches
      orderBy: { postCode: 'asc' },
    });

    return postCodes.map((pc) => ({
      postCode: pc.postCode,
      placeName: pc.placeName,
      adminName1: pc.adminName1 ?? undefined,
      adminName2: pc.adminName2 ?? undefined,
      adminName3: pc.adminName3 ?? undefined,
      latitude: pc.latitude,
      longitude: pc.longitude,
    }));
  }
}
