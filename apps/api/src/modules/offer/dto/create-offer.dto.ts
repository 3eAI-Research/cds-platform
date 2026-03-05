import {
  IsString,
  IsUUID,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';

/**
 * POST /api/v1/offers — Submit an offer for a demand.
 *
 * Provider submits totalPriceAmount in cents.
 * Commission is calculated server-side (CommissionService).
 */
export class CreateOfferDto {
  @IsUUID()
  demandId!: string;

  @IsUUID()
  providerCompanyId!: string;

  @IsInt()
  @Min(100) // Minimum 1 EUR
  totalPriceAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsObject()
  priceBreakdown?: Record<string, number>;
}

// --- Response DTO ---

export class OfferResponseDto {
  id!: string;
  demandId!: string;
  providerUserId!: string;
  providerCompanyId!: string;
  status!: string;
  totalPriceAmount!: number;
  totalPriceCurrency!: string;
  commissionAmount!: number;
  commissionRate!: number;
  providerNetAmount!: number;
  vatAmount!: number;
  vatRate!: number;
  message?: string | null;
  validUntil!: string;
  priceBreakdown?: Record<string, unknown> | null;
  submittedAt?: string | null;
  createdAt!: string;
  updatedAt!: string;
}
