import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BusinessException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import {
  CreateReviewDto,
  ReviewDirection,
  ReviewResponseDto,
} from '../dto/review.dto';

/**
 * Review service — bi-directional rating system (Bewertung).
 *
 * Both customer and provider can review each other after contract is ACTIVE or COMPLETED.
 * One review per direction per contract (enforced by DB unique constraint).
 * Review aggregates are updated on each new review.
 */
@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submit a review for a contract.
   * Validates contract status and checks for duplicate reviews.
   */
  async create(
    dto: CreateReviewDto,
    userId: string,
  ): Promise<ReviewResponseDto> {
    // Validate contract exists and is in reviewable status
    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract', dto.contractId);
    }

    if (!['ACTIVE', 'COMPLETED'].includes(contract.status)) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Contract ${dto.contractId} is ${contract.status}, reviews only allowed for ACTIVE or COMPLETED contracts`,
      );
    }

    // Determine reviewee based on direction
    const revieweeUserId =
      dto.direction === ReviewDirection.CUSTOMER_TO_PROVIDER
        ? contract.providerUserId
        : contract.customerUserId;

    // Verify reviewer is the correct party
    const expectedReviewerId =
      dto.direction === ReviewDirection.CUSTOMER_TO_PROVIDER
        ? contract.customerUserId
        : contract.providerUserId;

    // MVP: skip strict user check (hardcoded userIds)

    const review = await this.prisma.$transaction(async (tx) => {
      // Check duplicate (also enforced by DB unique constraint)
      const existing = await tx.review.findFirst({
        where: {
          contractId: dto.contractId,
          direction: dto.direction,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new BusinessException(
          ErrorCode.BIZ_REVIEW_ALREADY_EXISTS,
          `Review already exists for contract ${dto.contractId} direction ${dto.direction}`,
        );
      }

      const review = await tx.review.create({
        data: {
          demandId: contract.demandId,
          contractId: dto.contractId,
          reviewerUserId: userId,
          revieweeUserId,
          direction: dto.direction,
          rating: dto.rating,
          comment: dto.comment ?? null,
          aspectRatings: dto.aspectRatings
            ? (dto.aspectRatings as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: 'PUBLISHED',
          createdBy: userId,
        },
      });

      // Update review aggregate
      await this.updateAggregate(tx, revieweeUserId, dto.direction);

      return review;
    });

    // Emit event for provider module denormalization
    if (dto.direction === ReviewDirection.CUSTOMER_TO_PROVIDER) {
      this.eventEmitter.emit('review.submitted', {
        reviewId: review.id,
        revieweeUserId,
        contractId: dto.contractId,
        rating: dto.rating,
        direction: dto.direction,
      });
    }

    return this.toResponseDto(review);
  }

  /**
   * Get review by ID.
   */
  async findById(id: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findFirst({
      where: { id, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException('Review', id);
    }

    return this.toResponseDto(review);
  }

  /**
   * List reviews with pagination and filters.
   */
  async findMany(params: {
    page: number;
    pageSize: number;
    contractId?: string;
    revieweeUserId?: string;
    direction?: string;
  }) {
    const { page, pageSize, contractId, revieweeUserId, direction } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null };
    if (contractId) where.contractId = contractId;
    if (revieweeUserId) where.revieweeUserId = revieweeUserId;
    if (direction) where.direction = direction;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: items.map((r) => this.toResponseDto(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update (or create) the review aggregate for a reviewee + direction.
   */
  private async updateAggregate(
    tx: Prisma.TransactionClient,
    revieweeUserId: string,
    direction: string,
  ): Promise<void> {
    // Calculate fresh aggregate from all reviews
    const stats = await tx.review.aggregate({
      where: {
        revieweeUserId,
        direction,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = stats._avg.rating ?? 0;
    const totalReviews = stats._count.rating;

    // Get distribution
    const reviews = await tx.review.findMany({
      where: {
        revieweeUserId,
        direction,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      select: { rating: true },
    });

    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    for (const r of reviews) {
      distribution[String(r.rating)] = (distribution[String(r.rating)] || 0) + 1;
    }

    await tx.reviewAggregate.upsert({
      where: {
        revieweeUserId_direction: { revieweeUserId, direction },
      },
      create: {
        revieweeUserId,
        direction,
        averageRating,
        totalReviews,
        ratingDistribution: distribution,
      },
      update: {
        averageRating,
        totalReviews,
        ratingDistribution: distribution,
      },
    });
  }

  private toResponseDto(review: {
    id: string;
    demandId: string;
    contractId: string;
    reviewerUserId: string;
    revieweeUserId: string;
    direction: string;
    rating: number;
    comment: string | null;
    aspectRatings: unknown;
    status: string;
    createdAt: Date;
  }): ReviewResponseDto {
    return {
      id: review.id,
      demandId: review.demandId,
      contractId: review.contractId,
      reviewerUserId: review.reviewerUserId,
      revieweeUserId: review.revieweeUserId,
      direction: review.direction,
      rating: review.rating,
      comment: review.comment,
      aspectRatings: review.aspectRatings,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
