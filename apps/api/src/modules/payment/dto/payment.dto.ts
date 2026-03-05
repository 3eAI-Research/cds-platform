import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Payment transaction types */
export enum PaymentType {
  SERVICE_PAYMENT = 'SERVICE_PAYMENT',
  DEPOSIT = 'DEPOSIT',
  REFUND = 'REFUND',
  DEPOSIT_RETURN = 'DEPOSIT_RETURN',
}

/** Payment status machine: PENDING → COMPLETED | FAILED | REFUNDED */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * POST /api/v1/payments — Create a manual payment record (MVP).
 * Phase 2: Stripe webhook will create these automatically.
 */
export class CreatePaymentDto {
  @IsString()
  contractId!: string;

  @IsString()
  demandId!: string;

  @IsString()
  providerCompanyId!: string;

  @IsEnum(PaymentType)
  type!: PaymentType;

  @IsInt()
  @Min(1)
  totalAmount!: number; // cents

  @IsOptional()
  @IsString()
  @MaxLength(3)
  totalCurrency?: string; // defaults to EUR
}

/**
 * PATCH /api/v1/payments/:id/complete — Mark as completed
 */
export class CompletePaymentDto {
  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;
}

/**
 * GET /api/v1/payments — Query parameters
 */
export class ListPaymentsQueryDto {
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

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  contractId?: string;
}

// --- Response DTO ---

export class PaymentResponseDto {
  id!: string;
  contractId!: string;
  demandId!: string;
  customerUserId!: string;
  providerUserId!: string;
  providerCompanyId!: string;
  type!: string;
  status!: string;
  totalAmount!: number;
  totalCurrency!: string;
  commissionAmount!: number;
  commissionRate!: number;
  providerNetAmount!: number;
  vatAmount!: number;
  vatRate!: number;
  initiatedAt!: string;
  completedAt?: string | null;
  transferredAt?: string | null;
  createdAt!: string;
}
