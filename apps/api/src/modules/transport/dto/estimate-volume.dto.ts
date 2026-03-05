import { IsArray, IsUUID, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Volume Estimation DTOs — Ladevolumen calculation
 */

/** Request: item for volume estimation */
export class VolumeEstimationItem {
  @IsUUID()
  furnitureTypeId!: string;

  @IsNumber()
  @Min(0.1)
  quantity!: number; // count or linear meters
}

/** Request: estimate volume for a list of furniture items */
export class EstimateVolumeRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumeEstimationItem)
  items!: VolumeEstimationItem[];
}

/** Response: volume estimation result */
export class EstimateVolumeResponse {
  totalVolume!: number; // m³
  itemCount!: number;
  items!: VolumeEstimationItemResult[];
}

/** Response: single item volume result */
export class VolumeEstimationItemResult {
  furnitureTypeId!: string;
  name!: string;
  quantity!: number;
  unitVolume!: number; // m³ per unit
  totalVolume!: number; // unitVolume × quantity
}
