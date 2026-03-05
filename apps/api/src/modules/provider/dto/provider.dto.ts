import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Nested address DTO for provider company */
export class ProviderAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  houseNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  postCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  placeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  countryCode?: string;
}

/**
 * POST /api/v1/providers — Register a provider company.
 */
export class CreateProviderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phoneNumber!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  taxNumber!: string;

  @IsArray()
  @IsString({ each: true })
  supportedPostCodePrefixes!: string[];

  @ValidateNested()
  @Type(() => ProviderAddressDto)
  address!: ProviderAddressDto;
}

/** GET /api/v1/providers — Query parameters */
export class ListProvidersQueryDto {
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

export class ProviderResponseDto {
  id!: string;
  ownerUserId!: string;
  name!: string;
  email!: string;
  phoneNumber!: string;
  status!: string;
  supportedPostCodePrefixes!: string[];
  averageRating?: number | null;
  reviewCount!: number;
  completedJobCount!: number;
  createdAt!: string;
}
