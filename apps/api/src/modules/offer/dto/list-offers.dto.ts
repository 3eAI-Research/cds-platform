import { IsOptional, IsString, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GET /api/v1/offers — Query params for listing offers.
 */
export class ListOffersQueryDto {
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
  @IsUUID()
  demandId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  providerCompanyId?: string;
}
