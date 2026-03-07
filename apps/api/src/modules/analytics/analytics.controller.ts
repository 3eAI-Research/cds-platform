import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── Provider Endpoints ─────────────────────────────────────────────

  @Roles('provider_owner')
  @Get('provider/stats')
  async getProviderStats(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getProviderStats(user.userId);
  }

  @Roles('provider_owner')
  @Get('provider/revenue')
  async getProviderRevenue(
    @CurrentUser() user: AuthUser,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getProviderMonthlyRevenue(
      user.userId,
      Number(months) || 12,
    );
  }

  @Roles('provider_owner')
  @Get('provider/ratings')
  async getProviderRatings(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getProviderRatingBreakdown(user.userId);
  }

  // ─── Admin Endpoints ────────────────────────────────────────────────

  @Roles('admin')
  @Get('admin/stats')
  async getPlatformStats() {
    return this.analyticsService.getPlatformStats();
  }

  @Roles('admin')
  @Get('admin/demands')
  async getDemandsByMonth(@Query('months') months?: string) {
    return this.analyticsService.getDemandsByMonth(Number(months) || 12);
  }
}
