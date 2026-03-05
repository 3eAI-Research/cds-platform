/**
 * CDS Platform — REST API Contracts
 *
 * Type-safe endpoint definitions for all 9 NestJS modules.
 * Every endpoint specifies: path, method, request/response types, auth role, error codes.
 *
 * Reference:
 * - HLD Section 3: Module APIs (docs/plans/cds-mvp-hld.md)
 * - HLD Section 4: Response wrapper, error format, i18n
 * - HLD Section 5: Permission matrix
 * - Domain model: docs/domain-model/*.ts
 *
 * Base URL: /api/v1
 * Auth: Bearer JWT (Keycloak OIDC)
 * Content-Type: application/json
 * Localization: Accept-Language header (de | en)
 *
 * @module api-contracts
 */

import { PII, Money, DemandStatus, OfferStatus, ContractStatus, PaymentStatus, ProviderStatus, UserRole } from './core-types';
import { Demand, DemandServiceType, CreateDemandRequest } from './demand';
import { Offer, OfferPriceBreakdown, OfferStats } from './offer';
import { Transportation, TransportEstimation, TransportEstimationResult } from './transport';
import { EstateType, EstatePartType, FurnitureType, FurnitureGroupType, EstateTypePartTypeMap } from './estate';
import { ProviderCompany, ProviderEmployee, ProviderDocument, ProviderDocumentType, ProviderEmployeeRole } from './provider';
import { Contract } from './contract';
import { PaymentTransaction, CheckoutSession, PaymentTransactionType } from './payment';
import { Review, ReviewDirection, ReviewAspect, ReviewAggregate } from './review';
import { Notification, NotificationDeliveryStatus } from './notification';

// =============================================================================
// Standard API Types (HLD Section 4)
// =============================================================================

/**
 * Standard API response wrapper.
 * All endpoints return this shape.
 *
 * HLD Section 4.1
 */
export interface ApiResponse<T> {
  success: boolean;
  /** Human-readable message (localized per Accept-Language) */
  message: string;
  /** Machine-readable code (e.g., 'DEMAND_CREATED') */
  code: string;
  /** Response payload — null on error */
  data: T | null;
  meta: ApiMeta;
  /** Validation/business errors — empty on success */
  errors: ApiFieldError[];
}

export interface ApiMeta {
  timestamp: string; // ISO 8601
  traceId: string;   // OpenTelemetry trace ID
  locale: string;    // Response locale
}

export interface PaginatedMeta extends ApiMeta {
  page: number;
  size: number;
  total: number;
}

export type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginatedMeta };

/**
 * Standard error detail.
 * HLD Section 4.2
 */
export interface ApiFieldError {
  field?: string;
  message: string;
  code: ErrorCode;
}

/**
 * Error code taxonomy.
 * HLD Section 4.2 + Mimar's instruction:
 * VAL_* = validation, AUTH_* = authorization, BIZ_* = business rule, SYS_* = system
 */
export type ErrorCode =
  // --- Validation errors (400) ---
  | 'VAL_INVALID_INPUT'
  | 'VAL_MISSING_FIELD'
  | 'VAL_INVALID_PLZ'
  | 'VAL_INVALID_DATE_RANGE'
  | 'VAL_INVALID_PRICE'
  | 'VAL_INVALID_RATING'
  | 'VAL_FILE_TOO_LARGE'
  | 'VAL_UNSUPPORTED_FILE_TYPE'
  // --- Authorization errors (401/403) ---
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_NOT_OWN_RESOURCE'
  | 'AUTH_INSUFFICIENT_ROLE'
  // --- Business rule errors (409/422) ---
  | 'BIZ_DEMAND_NOT_PUBLISHED'
  | 'BIZ_DEMAND_ALREADY_ACCEPTED'
  | 'BIZ_DEMAND_EXPIRED'
  | 'BIZ_OFFER_ALREADY_ACCEPTED'
  | 'BIZ_OFFER_EXPIRED'
  | 'BIZ_OFFER_OWN_DEMAND'
  | 'BIZ_PROVIDER_NOT_ACTIVE'
  | 'BIZ_PROVIDER_OUTSIDE_COVERAGE'
  | 'BIZ_CONTRACT_ALREADY_ACCEPTED'
  | 'BIZ_CONTRACT_NOT_ACTIVE'
  | 'BIZ_PAYMENT_ALREADY_COMPLETED'
  | 'BIZ_REVIEW_ALREADY_SUBMITTED'
  | 'BIZ_REVIEW_NOT_ELIGIBLE'
  | 'BIZ_DEPOSIT_ALREADY_PAID'
  | 'BIZ_CONSENT_REQUIRED'
  // --- System errors (500) ---
  | 'SYS_INTERNAL_ERROR'
  | 'SYS_DATABASE_ERROR'
  | 'SYS_STRIPE_ERROR'
  | 'SYS_KEYCLOAK_ERROR'
  | 'SYS_EMAIL_ERROR';

/**
 * Standard pagination parameters (query string).
 */
export interface PaginationParams {
  page?: number;    // default: 1
  size?: number;    // default: 20, max: 100
  sortBy?: string;  // field name
  sortOrder?: 'asc' | 'desc'; // default: 'desc'
}

/**
 * Role required to access an endpoint.
 * Maps to Keycloak realm roles (HLD Section 5).
 */
export type AuthRole =
  | 'customer'
  | 'provider_owner'
  | 'provider_dispatcher'
  | 'provider_worker'
  | 'admin'
  | 'public';      // no auth required (e.g., seed data lookups)

// =============================================================================
// Auth Module API (AuthModule)
// =============================================================================

/**
 * Auth Module Endpoints
 *
 * Schema: shared
 * Keycloak integration, user profile, GDPR consent/erasure.
 * HLD Section 3.1
 */

// GET /api/v1/auth/profile
export interface GetProfileResponse {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  locale: string;
  registeredAt: Date;
}

// PATCH /api/v1/auth/profile
export interface UpdateProfileRequest {
  displayName?: string;
  locale?: string; // 'de' | 'en'
}

// POST /api/v1/auth/consent
export interface RecordConsentRequest {
  /** What the user consented to */
  consentType: ConsentType;
  /** Whether consent was given or withdrawn */
  granted: boolean;
}

export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'COOKIE_ANALYTICS'
  | 'MARKETING_EMAIL';

export interface ConsentRecord {
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date;
  ipAddress: string;
}

// GET /api/v1/auth/data-export — GDPR data portability
export interface DataExportResponse {
  /** JSON export of all user data across all modules */
  profile: GetProfileResponse;
  consents: ConsentRecord[];
  demands?: object[];     // anonymized demand data
  offers?: object[];      // anonymized offer data
  contracts?: object[];   // anonymized contract data
  reviews?: object[];
  exportedAt: Date;
}

// DELETE /api/v1/auth/account — GDPR right to erasure
// Response: ApiResponse<{ erasureId: string; status: 'PROCESSING' | 'COMPLETED' }>

// --- Auth Module API Type Map ---
export interface AuthApi {
  'GET /api/v1/auth/profile': {
    request: never;
    response: ApiResponse<GetProfileResponse>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher' | 'provider_worker';
  };
  'PATCH /api/v1/auth/profile': {
    request: UpdateProfileRequest;
    response: ApiResponse<GetProfileResponse>;
    auth: 'customer' | 'provider_owner';
  };
  'POST /api/v1/auth/consent': {
    request: RecordConsentRequest;
    response: ApiResponse<ConsentRecord>;
    auth: 'customer' | 'provider_owner';
  };
  'GET /api/v1/auth/consent': {
    request: never;
    response: ApiResponse<ConsentRecord[]>;
    auth: 'customer' | 'provider_owner';
  };
  'GET /api/v1/auth/data-export': {
    request: never;
    response: ApiResponse<DataExportResponse>;
    auth: 'customer' | 'provider_owner';
  };
  'DELETE /api/v1/auth/account': {
    request: never;
    response: ApiResponse<{ erasureId: string; status: 'PROCESSING' | 'COMPLETED' }>;
    auth: 'customer' | 'provider_owner';
  };
}

// =============================================================================
// Provider Module API (ProviderModule)
// =============================================================================

/**
 * Provider Module Endpoints
 *
 * Schema: provider
 * Company onboarding, profile, deposit, documents.
 * HLD Section 3.2
 */

// POST /api/v1/providers — Register new provider
export interface RegisterProviderRequest {
  companyName: string;
  email: string;
  phoneNumber: string;
  taxNumber: string;
  /** German address */
  address: {
    street: string;
    houseNumber: string;
    postCode: string;
    placeName: string;
    countryCode: string;
  };
  /** PLZ prefixes the company serves (e.g., ['40','41','42']) */
  supportedPostCodePrefixes: string[];
}

// GET /api/v1/providers/:id — Public profile view
export interface ProviderPublicProfile {
  id: string;
  name: string;
  status: ProviderStatus;
  supportedPostCodePrefixes: string[];
  averageRating?: number;
  reviewCount: number;
  completedJobCount: number;
  registeredAt: Date;
}

// PATCH /api/v1/providers/:id
export interface UpdateProviderRequest {
  companyName?: string;
  email?: string;
  phoneNumber?: string;
  supportedPostCodePrefixes?: string[];
}

// POST /api/v1/providers/:id/documents
export interface UploadDocumentRequest {
  type: ProviderDocumentType;
  /** Base64 encoded file or multipart form data */
  file: unknown; // multipart/form-data — handled by NestJS FileInterceptor
}

// POST /api/v1/providers/:id/deposit — Initiate deposit payment
export interface InitiateDepositResponse {
  stripeCheckoutUrl: string;
  depositAmount: Money;
  expiresAt: Date;
}

// GET /api/v1/providers/:id/coverage
export interface ProviderCoverageResponse {
  companyId: string;
  supportedPostCodePrefixes: string[];
  /** Resolved city/region names for each prefix */
  resolvedRegions: { prefix: string; regionName: string }[];
}

// GET /api/v1/providers — List providers (admin + marketplace)
export interface ListProvidersFilter extends PaginationParams {
  status?: ProviderStatus;
  postCodePrefix?: string;  // filter by coverage area
  minRating?: number;
}

// --- Provider Module API Type Map ---
export interface ProviderApi {
  'POST /api/v1/providers': {
    request: RegisterProviderRequest;
    response: ApiResponse<ProviderCompany>;
    auth: 'provider_owner';
  };
  'GET /api/v1/providers/:id': {
    request: never;
    response: ApiResponse<ProviderPublicProfile>;
    auth: 'public';
  };
  'PATCH /api/v1/providers/:id': {
    request: UpdateProviderRequest;
    response: ApiResponse<ProviderCompany>;
    auth: 'provider_owner' | 'admin';
  };
  'POST /api/v1/providers/:id/documents': {
    request: UploadDocumentRequest;
    response: ApiResponse<ProviderDocument>;
    auth: 'provider_owner';
  };
  'POST /api/v1/providers/:id/deposit': {
    request: never;
    response: ApiResponse<InitiateDepositResponse>;
    auth: 'provider_owner';
  };
  'GET /api/v1/providers/:id/coverage': {
    request: never;
    response: ApiResponse<ProviderCoverageResponse>;
    auth: 'public';
  };
  'GET /api/v1/providers': {
    request: ListProvidersFilter;
    response: PaginatedResponse<ProviderPublicProfile>;
    auth: 'admin';
  };
}

// =============================================================================
// Demand Module API (DemandModule)
// =============================================================================

/**
 * Demand Module Endpoints
 *
 * Schema: demand
 * Customer moving request lifecycle.
 * HLD Section 3.3
 */

// GET /api/v1/demands — List demands
export interface ListDemandsFilter extends PaginationParams {
  status?: DemandStatus;
  serviceType?: DemandServiceType;
  /** Filter by from/to PLZ (for provider marketplace view) */
  fromPostCode?: string;
  toPostCode?: string;
  /** Date range filter */
  dateFrom?: Date;
  dateTo?: Date;
  /** Only show demands the current user can bid on (provider view) */
  biddable?: boolean;
}

// GET /api/v1/demands/:id — Demand detail view
export interface DemandDetailResponse extends Demand {
  /** Resolved transportation details (cross-module read) */
  transportation?: TransportationSummary;
  /** Offer stats for this demand */
  offerStats?: OfferStats;
}

/** Denormalized transport summary included in demand detail */
export interface TransportationSummary {
  transportationId: string;
  fromCity: string;
  fromPostCode: string;
  toCity: string;
  toPostCode: string;
  estimatedVolume: number;
  estimatedDistanceKm: number;
  preferredDateStart: Date;
  preferredDateEnd: Date;
  /** Summarized services */
  furnitureMontage: boolean;
  kitchenMontage: boolean;
  packingService: boolean;
  halteverbotRequired: boolean;
}

// --- Demand Module API Type Map ---
export interface DemandApi {
  'POST /api/v1/demands': {
    /** Orchestration endpoint — dispatches to transport module */
    request: CreateDemandRequest;
    response: ApiResponse<DemandDetailResponse>;
    auth: 'customer';
  };
  'GET /api/v1/demands/:id': {
    request: never;
    response: ApiResponse<DemandDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher' | 'admin';
  };
  'GET /api/v1/demands': {
    request: ListDemandsFilter;
    response: PaginatedResponse<DemandDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher' | 'admin';
  };
  'PATCH /api/v1/demands/:id': {
    request: Partial<Pick<Demand, 'additionalNotes' | 'preferredLocale' | 'expiresAt'>>;
    response: ApiResponse<Demand>;
    auth: 'customer';
  };
  'DELETE /api/v1/demands/:id': {
    request: { reason?: string };
    response: ApiResponse<{ demandId: string; status: 'CANCELLED' }>;
    auth: 'customer' | 'admin';
  };
}

// =============================================================================
// Offer Module API (OfferModule)
// =============================================================================

/**
 * Offer Module Endpoints
 *
 * Schema: offer
 * Provider bidding, price transparency, commission calculation.
 * HLD Section 3.4
 */

// POST /api/v1/demands/:demandId/offers — Submit offer
export interface SubmitOfferRequest {
  /** Total price (EUR cents). Provider enters this. */
  totalPrice: Money;
  /** Optional: detailed price breakdown for transparency */
  priceBreakdown?: {
    baseTransportPrice: Money;
    assemblyCost?: Money;
    kitchenCost?: Money;
    packingCost?: Money;
    halteverbotCost?: Money;
    additionalCharges?: { description: string; amount: Money }[];
  };
  /** Optional message to customer */
  message?: string;
  /** Offer validity period (default: 7 days) */
  validUntil?: Date;
  /** VAT rate (default: 0.19 for standard, 0.07 reduced, 0 for Kleinunternehmer) */
  vatRate?: number;
}

/** Response includes auto-calculated commission fields */
export interface OfferCreatedResponse extends Offer {
  /** Commission was auto-calculated by the platform */
  commissionCalculated: boolean;
}

// GET /api/v1/demands/:demandId/offers — List offers for a demand
export interface ListOffersFilter extends PaginationParams {
  status?: OfferStatus;
}

// POST /api/v1/offers/:id/accept — Customer accepts
// No request body — action endpoint

// POST /api/v1/offers/:id/reject — Customer rejects
export interface RejectOfferRequest {
  reason?: string;
}

// POST /api/v1/offers/:id/withdraw — Provider withdraws
export interface WithdrawOfferRequest {
  reason?: string;
}

// GET /api/v1/providers/:id/offers — Provider's own offers
export interface ListProviderOffersFilter extends PaginationParams {
  status?: OfferStatus;
}

// --- Offer Module API Type Map ---
export interface OfferApi {
  'POST /api/v1/demands/:demandId/offers': {
    request: SubmitOfferRequest;
    response: ApiResponse<OfferCreatedResponse>;
    auth: 'provider_owner' | 'provider_dispatcher';
  };
  'GET /api/v1/demands/:demandId/offers': {
    request: ListOffersFilter;
    response: PaginatedResponse<Offer>;
    auth: 'customer' | 'admin';
  };
  'GET /api/v1/offers/:id': {
    request: never;
    response: ApiResponse<Offer>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher' | 'admin';
  };
  'POST /api/v1/offers/:id/accept': {
    request: never;
    response: ApiResponse<Offer>;
    auth: 'customer';
  };
  'POST /api/v1/offers/:id/reject': {
    request: RejectOfferRequest;
    response: ApiResponse<Offer>;
    auth: 'customer';
  };
  'POST /api/v1/offers/:id/withdraw': {
    request: WithdrawOfferRequest;
    response: ApiResponse<Offer>;
    auth: 'provider_owner' | 'provider_dispatcher';
  };
  'GET /api/v1/providers/:id/offers': {
    request: ListProviderOffersFilter;
    response: PaginatedResponse<Offer>;
    auth: 'provider_owner' | 'provider_dispatcher';
  };
}

// =============================================================================
// Transport Module API (TransportModule)
// =============================================================================

/**
 * Transport Module Endpoints
 *
 * Schema: transport
 * Seed data lookups, volume calculation, PLZ lookup.
 * Most endpoints are public (seed data is not sensitive).
 * HLD Section 3.5
 */

// GET /api/v1/estate-types — Localized estate types
export interface EstateTypeResponse {
  id: string;
  name: string; // localized per Accept-Language
  description: string;
  isActive: boolean;
}

// GET /api/v1/estate-types/:id/part-types — Valid room types for estate type
export interface EstatePartTypeResponse {
  id: string;
  name: string;
  description: string;
  isOuterPart: boolean;
  isActive: boolean;
}

// GET /api/v1/furniture-types — Furniture catalog
export interface ListFurnitureTypesFilter extends PaginationParams {
  groupId?: string;
  assemblableOnly?: boolean;
  /** Search by localized name */
  search?: string;
}

export interface FurnitureTypeResponse {
  id: string;
  name: string; // localized
  description: string;
  furnitureGroupTypeId: string;
  volume: number; // m³
  assemblable: boolean;
  disassembleCost?: number;
  assembleCost?: number;
  flatRate?: number;
  calculationType: string;
}

// GET /api/v1/furniture-groups
export interface FurnitureGroupResponse {
  id: string;
  name: string; // localized
  furnitureCount: number;
}

// POST /api/v1/transport/estimate-volume — Volume calculator
export interface EstimateVolumeRequest {
  rooms: {
    estatePartTypeId: string;
    furniture: { furnitureTypeId: string; quantity: number }[];
  }[];
}

export interface EstimateVolumeResponse {
  totalVolume: number; // m³
  totalItems: number;
  assemblyRequired: boolean;
  /** Per-room breakdown */
  roomBreakdown: {
    estatePartTypeId: string;
    roomVolume: number;
    itemCount: number;
  }[];
}

// GET /api/v1/post-codes/:code — PLZ lookup
export interface PostCodeLookupResponse {
  postCode: string;
  placeName: string;
  adminName1: string; // Bundesland (Federal state)
  adminName2: string; // Regierungsbezirk (District)
  latitude: number;
  longitude: number;
  countryCode: string;
}

// --- Transport Module API Type Map ---
export interface TransportApi {
  'GET /api/v1/estate-types': {
    request: never;
    response: ApiResponse<EstateTypeResponse[]>;
    auth: 'public';
  };
  'GET /api/v1/estate-types/:id/part-types': {
    request: never;
    response: ApiResponse<EstatePartTypeResponse[]>;
    auth: 'public';
  };
  'GET /api/v1/furniture-types': {
    request: ListFurnitureTypesFilter;
    response: PaginatedResponse<FurnitureTypeResponse>;
    auth: 'public';
  };
  'GET /api/v1/furniture-groups': {
    request: never;
    response: ApiResponse<FurnitureGroupResponse[]>;
    auth: 'public';
  };
  'POST /api/v1/transport/estimate-volume': {
    request: EstimateVolumeRequest;
    response: ApiResponse<EstimateVolumeResponse>;
    auth: 'public';
  };
  'GET /api/v1/post-codes/:code': {
    request: never;
    response: ApiResponse<PostCodeLookupResponse>;
    auth: 'public';
  };
}

// =============================================================================
// Contract Module API (ContractModule)
// =============================================================================

/**
 * Contract Module Endpoints
 *
 * Schema: contract
 * Digital service contracts, mutual acceptance, PDF.
 * HLD Section 3.6
 */

// GET /api/v1/contracts/:id — Contract detail
export interface ContractDetailResponse extends Contract {
  /** Whether current user has accepted */
  currentUserAccepted: boolean;
  /** Whether the other party has accepted */
  otherPartyAccepted: boolean;
  /** PDF available? */
  pdfAvailable: boolean;
}

// POST /api/v1/contracts/:id/accept
// No request body — action endpoint. Auth determines which party accepted.

// POST /api/v1/contracts/:id/cancel
export interface CancelContractRequest {
  reason: string;
}

// GET /api/v1/contracts/:id/pdf — Download PDF
// Response: binary PDF file (Content-Type: application/pdf)

// GET /api/v1/contracts — List user's contracts
export interface ListContractsFilter extends PaginationParams {
  status?: ContractStatus;
}

// --- Contract Module API Type Map ---
export interface ContractApi {
  'GET /api/v1/contracts/:id': {
    request: never;
    response: ApiResponse<ContractDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher' | 'admin';
  };
  'POST /api/v1/contracts/:id/accept': {
    request: never;
    response: ApiResponse<ContractDetailResponse>;
    auth: 'customer' | 'provider_owner';
  };
  'POST /api/v1/contracts/:id/cancel': {
    request: CancelContractRequest;
    response: ApiResponse<ContractDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'admin';
  };
  'GET /api/v1/contracts/:id/pdf': {
    request: never;
    /** Binary PDF — Content-Type: application/pdf */
    response: Blob;
    auth: 'customer' | 'provider_owner' | 'admin';
  };
  'GET /api/v1/contracts': {
    request: ListContractsFilter;
    response: PaginatedResponse<ContractDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher' | 'admin';
  };
}

// =============================================================================
// Payment Module API (PaymentModule)
// =============================================================================

/**
 * Payment Module Endpoints
 *
 * Schema: payment
 * Stripe Connect checkout, webhook handling, transaction tracking.
 * HLD Section 3.7
 */

// POST /api/v1/payments/checkout — Create Stripe checkout session
export interface CreateCheckoutRequest {
  contractId: string;
  /** Frontend redirect URLs */
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  expiresAt: Date;
  amount: Money;
  commissionAmount: Money;
}

// POST /api/v1/payments/webhook — Stripe webhook (no auth — signature verified)
// Request body: raw Stripe webhook payload
// Stripe-Signature header validated

// GET /api/v1/payments/transactions/:id
export interface TransactionDetailResponse extends PaymentTransaction {
  /** Stripe dashboard link (admin only) */
  stripeDashboardUrl?: string;
}

// GET /api/v1/payments/transactions — List transactions
export interface ListTransactionsFilter extends PaginationParams {
  status?: PaymentStatus;
  type?: PaymentTransactionType;
  contractId?: string;
  /** Date range */
  dateFrom?: Date;
  dateTo?: Date;
}

// POST /api/v1/payments/deposits — Initiate provider deposit
export interface InitiateProviderDepositRequest {
  companyId: string;
  successUrl: string;
  cancelUrl: string;
}

// POST /api/v1/payments/reconcile — Manual reconciliation (admin)
export interface ReconcilePaymentRequest {
  stripePaymentIntentId: string;
}

export interface ReconcilePaymentResponse {
  transactionId: string;
  previousStatus: PaymentStatus;
  currentStatus: PaymentStatus;
  reconciled: boolean;
}

// --- Payment Module API Type Map ---
export interface PaymentApi {
  'POST /api/v1/payments/checkout': {
    request: CreateCheckoutRequest;
    response: ApiResponse<CreateCheckoutResponse>;
    auth: 'customer';
  };
  'POST /api/v1/payments/webhook': {
    /** Raw Stripe payload — signature verification via Stripe-Signature header */
    request: unknown;
    response: { received: true };
    auth: 'public'; // webhook — no JWT, signature-verified
  };
  'GET /api/v1/payments/transactions/:id': {
    request: never;
    response: ApiResponse<TransactionDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'admin';
  };
  'GET /api/v1/payments/transactions': {
    request: ListTransactionsFilter;
    response: PaginatedResponse<TransactionDetailResponse>;
    auth: 'customer' | 'provider_owner' | 'admin';
  };
  'POST /api/v1/payments/deposits': {
    request: InitiateProviderDepositRequest;
    response: ApiResponse<CreateCheckoutResponse>;
    auth: 'provider_owner';
  };
  'POST /api/v1/payments/reconcile': {
    request: ReconcilePaymentRequest;
    response: ApiResponse<ReconcilePaymentResponse>;
    auth: 'admin';
  };
}

// =============================================================================
// Review Module API (ReviewModule)
// =============================================================================

/**
 * Review Module Endpoints
 *
 * Schema: review
 * Bidirectional reviews after service completion.
 * HLD Section 3.8
 */

// POST /api/v1/contracts/:contractId/reviews — Submit review
export interface SubmitReviewRequest {
  /** 1-5 star rating */
  rating: number;
  /** Optional written review */
  comment?: string;
  /** Optional aspect ratings */
  aspectRatings?: {
    aspect: ReviewAspect;
    rating: number; // 1-5
  }[];
}

// GET /api/v1/providers/:id/reviews — Provider's reviews (public)
export interface ListProviderReviewsFilter extends PaginationParams {
  direction?: ReviewDirection;
  minRating?: number;
}

export interface ReviewPublicResponse {
  id: string;
  direction: ReviewDirection;
  rating: number;
  comment?: string;
  aspectRatings?: { aspect: ReviewAspect; rating: number }[];
  /** Reviewer display name (anonymized if preferred) */
  reviewerDisplayName: string;
  createdAt: Date;
}

// GET /api/v1/providers/:id/rating — Provider rating aggregate
export interface ProviderRatingResponse {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Per-aspect averages */
  aspectAverages?: Record<ReviewAspect, number>;
}

// --- Review Module API Type Map ---
export interface ReviewApi {
  'POST /api/v1/contracts/:contractId/reviews': {
    request: SubmitReviewRequest;
    response: ApiResponse<Review>;
    auth: 'customer' | 'provider_owner';
  };
  'GET /api/v1/providers/:id/reviews': {
    request: ListProviderReviewsFilter;
    response: PaginatedResponse<ReviewPublicResponse>;
    auth: 'public';
  };
  'GET /api/v1/reviews/:id': {
    request: never;
    response: ApiResponse<ReviewPublicResponse>;
    auth: 'public';
  };
  'GET /api/v1/providers/:id/rating': {
    request: never;
    response: ApiResponse<ProviderRatingResponse>;
    auth: 'public';
  };
}

// =============================================================================
// Notification Module API (NotificationModule)
// =============================================================================

/**
 * Notification Module Endpoints
 *
 * Schema: none (MVP: in-memory / Phase 2: persistent)
 * User notification history.
 * HLD Section 3.9
 */

// GET /api/v1/notifications — User's notification list
export interface ListNotificationsFilter extends PaginationParams {
  status?: NotificationDeliveryStatus;
  unreadOnly?: boolean;
}

export interface NotificationListItem {
  id: string;
  type: string; // NotificationType
  subject: string;
  status: NotificationDeliveryStatus;
  referenceType?: string;
  referenceId?: string;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

// PATCH /api/v1/notifications/:id/read — Mark as read
// No request body

// --- Notification Module API Type Map ---
export interface NotificationApi {
  'GET /api/v1/notifications': {
    request: ListNotificationsFilter;
    response: PaginatedResponse<NotificationListItem>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher';
  };
  'PATCH /api/v1/notifications/:id/read': {
    request: never;
    response: ApiResponse<NotificationListItem>;
    auth: 'customer' | 'provider_owner' | 'provider_dispatcher';
  };
}

// =============================================================================
// Unified API Type Map
// =============================================================================

/**
 * Complete CDS Platform API.
 * Union of all module APIs.
 * Can be used for type-safe API client generation.
 */
export interface CdsApi
  extends AuthApi,
    ProviderApi,
    DemandApi,
    OfferApi,
    TransportApi,
    ContractApi,
    PaymentApi,
    ReviewApi,
    NotificationApi {}

// =============================================================================
// Endpoint Summary
// =============================================================================

/**
 * ENDPOINT COUNT BY MODULE
 *
 * | Module       | Endpoints | Public | Customer | Provider | Admin |
 * |-------------|-----------|--------|----------|----------|-------|
 * | Auth         | 6         | 0      | 6        | 6        | 0     |
 * | Provider     | 7         | 2      | 0        | 5        | 2     |
 * | Demand       | 5         | 0      | 5        | 3        | 5     |
 * | Offer        | 7         | 0      | 4        | 4        | 1     |
 * | Transport    | 6         | 6      | 0        | 0        | 0     |
 * | Contract     | 5         | 0      | 5        | 4        | 4     |
 * | Payment      | 6         | 1*     | 2        | 2        | 3     |
 * | Review       | 4         | 3      | 2        | 2        | 0     |
 * | Notification | 2         | 0      | 2        | 2        | 0     |
 * |-------------|-----------|--------|----------|----------|-------|
 * | **Total**    | **48**    | 12     | 26       | 28       | 15    |
 *
 * * webhook endpoint is public but Stripe-signature verified
 *
 * Note: Some endpoints are accessible by multiple roles. Numbers above
 * count each role that can access the endpoint.
 */
