import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * PATCH /api/v1/contracts/:id/cancel
 */
export class CancelContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/**
 * GET /api/v1/contracts — Query parameters
 */
export class ListContractsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}

// --- Response DTO ---

export class ContractResponseDto {
  id!: string;
  demandId!: string;
  offerId!: string;
  customerUserId!: string;
  providerUserId!: string;
  providerCompanyId!: string;
  status!: string;
  agreedPriceAmount!: number;
  agreedPriceCurrency!: string;
  commissionAmount!: number;
  vatAmount!: number;
  serviceDate!: string;
  serviceDescription!: string;
  customerAcceptedAt?: string | null;
  providerAcceptedAt?: string | null;
  pdfStorageKey?: string | null;
  pdfGeneratedAt?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt!: string;
  updatedAt!: string;
}
