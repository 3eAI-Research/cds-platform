import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MistralService } from './mistral.service';

/**
 * Confidence threshold constants per BR-AGT-008.
 * - AUTO_MATCH (>80%): item is auto-matched to catalog
 * - SUGGESTED (50-80%): item is suggested, user should confirm
 * - below SUGGESTED: low confidence flag
 */
const CONFIDENCE_THRESHOLD = {
  AUTO_MATCH: 0.8,
  SUGGESTED: 0.5,
} as const;

export interface DetectedItem {
  furnitureTypeId: string | null;
  name: string;
  confidence: number;
  quantity: number;
  matched: boolean;
  /** 'auto' (>80%), 'suggested' (50-80%), 'low' (<50%) per BR-AGT-008 */
  confidenceLevel: 'auto' | 'suggested' | 'low';
}

export interface PhotoAnalysisResult {
  detectedItems: DetectedItem[];
}

@Injectable()
export class PhotoAnalyzerService {
  private readonly logger = new Logger(PhotoAnalyzerService.name);

  constructor(
    private readonly mistralService: MistralService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Analyze one or more photos, detect furniture items via Mistral Vision,
   * merge/deduplicate results, and match against the FurnitureType catalog.
   */
  async analyzePhotos(
    photos: Array<{ buffer: Buffer; mimeType: string }>,
  ): Promise<PhotoAnalysisResult> {
    // 1. Analyze each photo in parallel via Mistral Vision
    const analysisResults = await Promise.all(
      photos.map(async (photo, index) => {
        try {
          const base64 = photo.buffer.toString('base64');
          return await this.mistralService.analyzePhoto(base64, photo.mimeType);
        } catch (error) {
          this.logger.warn(
            `Failed to analyze photo ${index + 1}/${photos.length}`,
            error,
          );
          return [];
        }
      }),
    );

    // 2. Merge results from all photos — deduplicate by name, sum quantities
    const merged = this.mergeDetectedItems(analysisResults.flat());

    // 3. Load furniture catalog from DB
    const furnitureTypes = await this.prisma.furnitureType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    // 4. Match each detected item against the catalog
    const detectedItems: DetectedItem[] = merged.map((item) => {
      const matchedType = furnitureTypes.find((ft) =>
        this.fuzzyMatch(item.name, ft.name as Record<string, string>),
      );

      const confidenceLevel = this.getConfidenceLevel(item.confidence);

      return {
        furnitureTypeId: matchedType?.id ?? null,
        name: item.name,
        confidence: item.confidence,
        quantity: item.quantity,
        matched: matchedType != null,
        confidenceLevel,
      };
    });

    this.logger.log(
      `Photo analysis complete: ${detectedItems.length} items detected, ` +
        `${detectedItems.filter((i) => i.matched).length} matched to catalog`,
    );

    return { detectedItems };
  }

  /**
   * Merge detected items from multiple photos by normalizing names.
   * Deduplicates by lowercase name — sums quantities, keeps highest confidence.
   */
  private mergeDetectedItems(
    items: Array<{ name: string; quantity: number; confidence: number }>,
  ): Array<{ name: string; quantity: number; confidence: number }> {
    const map = new Map<
      string,
      { name: string; quantity: number; confidence: number }
    >();

    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      const existing = map.get(key);

      if (existing) {
        existing.quantity += item.quantity;
        existing.confidence = Math.max(existing.confidence, item.confidence);
      } else {
        map.set(key, {
          name: item.name,
          quantity: item.quantity,
          confidence: item.confidence,
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Basic fuzzy match: compare detected name against all localized values
   * in the catalog entry. Match if either string contains the other.
   */
  private fuzzyMatch(
    detected: string,
    catalogName: Record<string, string>,
  ): boolean {
    const normalizedDetected = detected.toLowerCase().trim();

    for (const locale of Object.values(catalogName)) {
      const normalizedCatalog = (locale as string).toLowerCase().trim();

      if (
        normalizedDetected.includes(normalizedCatalog) ||
        normalizedCatalog.includes(normalizedDetected)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Classify confidence per BR-AGT-008 thresholds.
   */
  private getConfidenceLevel(
    confidence: number,
  ): 'auto' | 'suggested' | 'low' {
    if (confidence > CONFIDENCE_THRESHOLD.AUTO_MATCH) {
      return 'auto';
    }
    if (confidence >= CONFIDENCE_THRESHOLD.SUGGESTED) {
      return 'suggested';
    }
    return 'low';
  }
}
