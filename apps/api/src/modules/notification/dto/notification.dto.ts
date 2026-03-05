import { IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * GET /api/v1/notifications — Query parameters
 */
export class ListNotificationsQueryDto {
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
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;
}
