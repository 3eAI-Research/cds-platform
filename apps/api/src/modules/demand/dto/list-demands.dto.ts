import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GET /api/v1/demands — Query params for listing demands.
 */
export class ListDemandsQueryDto {
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
  customerUserId?: string;
}
