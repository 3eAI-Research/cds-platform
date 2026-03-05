/**
 * CDS Platform — Review Types (Bewertung)
 *
 * Bi-directional rating system: customer rates provider AND provider rates customer.
 * Trust mechanism — one of the CDS core principles.
 *
 * Lives in: review schema
 * OAK source: OAK.Model.BusinessModels.CommentModels.*
 *             OAK.Model.BusinessModels.TransportationModels.TransportationComment
 *
 * @module review
 */

import { BaseEntity, PII } from './core-types';

// =============================================================================
// Review (Bewertung)
// =============================================================================

/**
 * A review/rating for a completed service.
 * DE: Bewertung
 *
 * OAK equivalent: Comment + DemandComment + TransportationComment
 * OAK had separate comment entities per domain. We unify into one Review entity.
 *
 * CDS addition: bi-directional reviews.
 * Both parties review each other after service completion.
 */
export interface Review extends BaseEntity {
  /** Reference to the completed demand */
  demandId: string;
  /** Reference to the contract */
  contractId: string;

  /** Who wrote this review */
  reviewerUserId: string;
  /** Who is being reviewed */
  revieweeUserId: string;
  /** Direction of the review */
  direction: ReviewDirection;

  /** Rating 1-5. DE: Bewertung (Sterne) */
  rating: number;

  /** Written review text. DE: Bewertungstext — @pii (may contain personal details) */
  comment?: PII<string>;

  /** Specific aspect ratings (optional) */
  aspectRatings?: ReviewAspectRating[];

  /** Review status */
  status: ReviewStatus;
}

export enum ReviewDirection {
  /** Customer reviews provider. DE: Kundenbewertung */
  CUSTOMER_TO_PROVIDER = 'CUSTOMER_TO_PROVIDER',
  /** Provider reviews customer. DE: Anbieterbewertung */
  PROVIDER_TO_CUSTOMER = 'PROVIDER_TO_CUSTOMER',
}

export enum ReviewStatus {
  /** Review submitted, visible. DE: Veröffentlicht */
  PUBLISHED = 'PUBLISHED',
  /** Flagged for moderation. DE: Zur Überprüfung markiert */
  FLAGGED = 'FLAGGED',
  /** Removed by admin. DE: Entfernt */
  REMOVED = 'REMOVED',
}

// =============================================================================
// Review Aspects (Bewertungsaspekte)
// =============================================================================

/**
 * Rating for a specific aspect of the service.
 * DE: Aspektbewertung
 *
 * CDS addition — OAK only had a single comment/rating.
 * Aspect ratings give more actionable feedback.
 */
export interface ReviewAspectRating {
  aspect: ReviewAspect;
  rating: number; // 1-5
}

/**
 * Specific aspects that can be rated.
 *
 * Customer → Provider aspects:
 */
export enum ReviewAspect {
  /** Was the service on time? DE: Pünktlichkeit */
  PUNCTUALITY = 'PUNCTUALITY',
  /** Care with furniture/items. DE: Sorgfalt */
  CAREFULNESS = 'CAREFULNESS',
  /** Friendliness and communication. DE: Freundlichkeit */
  FRIENDLINESS = 'FRIENDLINESS',
  /** Was the final price as agreed? DE: Preis-Leistung */
  VALUE_FOR_MONEY = 'VALUE_FOR_MONEY',

  /** Provider → Customer: was the description accurate? DE: Beschreibungsgenauigkeit */
  DESCRIPTION_ACCURACY = 'DESCRIPTION_ACCURACY',
  /** Provider → Customer: accessibility/readiness. DE: Erreichbarkeit */
  ACCESSIBILITY = 'ACCESSIBILITY',
}

// =============================================================================
// Review Aggregates (Event-driven denormalization)
// =============================================================================

/**
 * Aggregated review statistics — published as events to provider/demand modules.
 *
 * Provider module denormalizes:
 * - ProviderCompany.averageRating
 * - ProviderCompany.reviewCount
 */
export interface ReviewAggregate {
  /** The user being reviewed */
  revieweeUserId: string;
  /** Direction filter */
  direction: ReviewDirection;
  /** Average rating across all reviews */
  averageRating: number;
  /** Total number of reviews */
  totalReviews: number;
  /** Rating distribution (1-star: N, 2-star: N, ...) */
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
