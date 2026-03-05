import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewDirection {
  CUSTOMER_TO_PROVIDER = 'CUSTOMER_TO_PROVIDER',
  PROVIDER_TO_CUSTOMER = 'PROVIDER_TO_CUSTOMER',
}

export enum ReviewAspect {
  PUNCTUALITY = 'PUNCTUALITY',
  CAREFULNESS = 'CAREFULNESS',
  COMMUNICATION = 'COMMUNICATION',
  VALUE_FOR_MONEY = 'VALUE_FOR_MONEY',
  PROFESSIONALISM = 'PROFESSIONALISM',
}

export class AspectRatingDto {
  @IsEnum(ReviewAspect)
  aspect!: ReviewAspect;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

/**
 * POST /api/v1/reviews — Submit a review for a contract.
 */
export class CreateReviewDto {
  @IsString()
  contractId!: string;

  @IsEnum(ReviewDirection)
  direction!: ReviewDirection;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AspectRatingDto)
  aspectRatings?: AspectRatingDto[];
}

/**
 * GET /api/v1/reviews — Query parameters
 */
export class ListReviewsQueryDto {
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
  contractId?: string;

  @IsOptional()
  @IsString()
  revieweeUserId?: string;

  @IsOptional()
  @IsEnum(ReviewDirection)
  direction?: ReviewDirection;
}

// --- Response DTO ---

export class ReviewResponseDto {
  id!: string;
  demandId!: string;
  contractId!: string;
  reviewerUserId!: string;
  revieweeUserId!: string;
  direction!: string;
  rating!: number;
  comment?: string | null;
  aspectRatings?: unknown;
  status!: string;
  createdAt!: string;
}
