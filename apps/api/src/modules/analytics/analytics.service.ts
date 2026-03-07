import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  // ─── Provider Endpoints ───────────────────────────────────────────────

  async getProviderStats(providerUserId: string) {
    const totalOffers = await this.prisma.offer.count({
      where: { providerUserId },
    });

    const acceptedOffers = await this.prisma.offer.count({
      where: { providerUserId, status: 'ACCEPTED' },
    });

    const activeContracts = await this.prisma.contract.count({
      where: { providerUserId, status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    });

    const completedContracts = await this.prisma.contract.count({
      where: { providerUserId, status: 'COMPLETED' },
    });

    const revenueResult = await this.prisma.contract.aggregate({
      where: { providerUserId, status: 'COMPLETED' },
      _sum: { agreedPriceAmount: true },
    });
    const totalRevenue = revenueResult._sum.agreedPriceAmount ?? 0;

    const ratingResult = await this.prisma.review.aggregate({
      where: { revieweeUserId: providerUserId },
      _avg: { rating: true },
      _count: true,
    });

    return {
      totalOffers,
      acceptedOffers,
      activeContracts,
      completedContracts,
      totalRevenue,
      averageRating: ratingResult._avg.rating ?? 0,
      totalReviews: ratingResult._count ?? 0,
    };
  }

  async getProviderMonthlyRevenue(providerUserId: string, months: number = 12) {
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);

    const result = await this.prisma.$queryRaw<
      Array<{ month: string; revenue: bigint; contract_count: bigint }>
    >`
      SELECT
        TO_CHAR(c.created_at, 'YYYY-MM') as month,
        COALESCE(SUM(c.agreed_price_amount), 0)::bigint as revenue,
        COUNT(*)::bigint as contract_count
      FROM contract.contracts c
      WHERE c.provider_user_id = ${providerUserId}::uuid
        AND c.status = 'COMPLETED'
        AND c.created_at >= ${sinceDate}
      GROUP BY TO_CHAR(c.created_at, 'YYYY-MM')
      ORDER BY month
    `;

    return result.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
      contractCount: Number(r.contract_count),
    }));
  }

  async getProviderRatingBreakdown(providerUserId: string) {
    // Use ReviewAggregate for pre-computed stats per direction
    const aggregates = await this.prisma.reviewAggregate.findMany({
      where: { revieweeUserId: providerUserId },
    });

    // Also compute average overall rating from individual reviews
    const overallResult = await this.prisma.review.aggregate({
      where: { revieweeUserId: providerUserId },
      _avg: { rating: true },
      _count: true,
    });

    return {
      overall: {
        averageRating: overallResult._avg.rating ?? 0,
        totalReviews: overallResult._count ?? 0,
      },
      byDirection: aggregates.map((agg) => ({
        direction: agg.direction,
        averageRating: agg.averageRating,
        totalReviews: agg.totalReviews,
        ratingDistribution: agg.ratingDistribution,
      })),
    };
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────────

  async getPlatformStats() {
    const [totalDemands, activeDemands, totalProviders, totalContracts] =
      await this.prisma.$transaction([
        this.prisma.demand.count(),
        this.prisma.demand.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.providerCompany.count(),
        this.prisma.contract.count(),
      ]);

    const revenueResult = await this.prisma.contract.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { agreedPriceAmount: true },
    });

    const commissionResult = await this.prisma.invoice.aggregate({
      _sum: { commissionAmount: true },
    });

    const activeProviders = await this.prisma.providerCompany.count({
      where: { status: 'APPROVED' },
    });

    return {
      totalDemands,
      activeDemands,
      totalProviders,
      activeProviders,
      totalContracts,
      totalRevenue: revenueResult._sum.agreedPriceAmount ?? 0,
      totalCommission: commissionResult._sum.commissionAmount ?? 0,
      onlineUsers: this.realtime.getOnlineUserCount(),
    };
  }

  async getDemandsByMonth(months: number = 12) {
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);

    const result = await this.prisma.$queryRaw<
      Array<{ month: string; count: bigint }>
    >`
      SELECT
        TO_CHAR(d.created_at, 'YYYY-MM') as month,
        COUNT(*)::bigint as count
      FROM demand.demands d
      WHERE d.created_at >= ${sinceDate}
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
      ORDER BY month
    `;

    return result.map((r) => ({
      month: r.month,
      count: Number(r.count),
    }));
  }
}
