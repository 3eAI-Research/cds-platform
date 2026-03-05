import {
  IsString,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Enums (matching Prisma/domain model) ---

export enum DemandServiceType {
  PRIVATE_MOVE = 'PRIVATE_MOVE',
  COMMERCIAL_MOVE = 'COMMERCIAL_MOVE',
  FURNITURE_TRANSPORT = 'FURNITURE_TRANSPORT',
}

export enum TransportType {
  LOCAL = 'LOCAL',
  LONG_DISTANCE = 'LONG_DISTANCE',
  INTERNATIONAL = 'INTERNATIONAL',
  COMMERCIAL = 'COMMERCIAL',
}

export enum ElevatorType {
  NONE = 'NONE',
  PERSONAL = 'PERSONAL',
  FREIGHT = 'FREIGHT',
}

// --- Nested DTOs (bottom-up) ---

/** A single furniture item in a room */
export class FurnitureItemDto {
  @IsUUID()
  furnitureTypeId!: string;

  @IsNumber()
  @Min(0.1)
  quantity!: number;
}

/** A room/part within an estate */
export class EstatePartDto {
  @IsUUID()
  estatePartTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FurnitureItemDto)
  furnitureItems!: FurnitureItemDto[];
}

/** Address DTO (from/to) */
export class AddressDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalInfo?: string;

  @IsOptional()
  @IsInt()
  @Min(-2)
  @Max(99)
  floor?: number;
}

/** Estate DTO — property details (from/to) */
export class EstateDto {
  @IsUUID()
  estateTypeId!: string;

  @IsNumber()
  @Min(1)
  totalSquareMeters!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  numberOfFloors?: number;

  @IsInt()
  @Min(1)
  numberOfRooms!: number;

  @IsOptional()
  @IsEnum(ElevatorType)
  elevatorType?: ElevatorType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  walkingWayMeters?: number;

  @IsOptional()
  @IsBoolean()
  halteverbotRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  furnitureMontage?: boolean;

  @IsOptional()
  @IsBoolean()
  kitchenMontage?: boolean;

  @IsOptional()
  @IsBoolean()
  packingService?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCellar?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cellarSquareMeters?: number;

  @IsOptional()
  @IsBoolean()
  hasLoft?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  loftSquareMeters?: number;

  @IsOptional()
  @IsBoolean()
  hasGardenGarage?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gardenGarageSquareMeters?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstatePartDto)
  @ArrayMinSize(1)
  parts!: EstatePartDto[];
}

/** Location DTO — combines address + estate for from/to */
export class LocationDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ValidateNested()
  @Type(() => EstateDto)
  estate!: EstateDto;
}

// --- Main Request DTO ---

/**
 * POST /api/v1/demands — Create a new demand (Umzugsanfrage).
 *
 * Deep nested structure:
 * Demand → { from: { address, estate: { parts: [{ furnitureItems }] } }, to: { ... } }
 */
export class CreateDemandDto {
  @IsEnum(DemandServiceType)
  serviceType!: DemandServiceType;

  @IsEnum(TransportType)
  transportType!: TransportType;

  @ValidateNested()
  @Type(() => LocationDto)
  from!: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  to!: LocationDto;

  @IsInt()
  @Min(1)
  @Max(20)
  numberOfPeople!: number;

  @IsDateString()
  preferredDateStart!: string;

  @IsDateString()
  preferredDateEnd!: string;

  @IsOptional()
  @IsBoolean()
  dateFlexibility?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  preferredLocale?: string;
}

// --- Response DTO ---

export class DemandResponseDto {
  id!: string;
  status!: string;
  serviceType!: string;
  transportationId!: string;
  customerUserId!: string;
  offerCount!: number;
  preferredLocale!: string;
  additionalNotes?: string | null;
  expiresAt?: string | null;
  createdAt!: string;
  updatedAt!: string;
}
