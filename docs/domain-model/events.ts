/**
 * CDS Platform — Domain Event Contracts
 *
 * Cross-module event definitions. Every module communicates with others
 * ONLY through these events — no direct service calls, no cross-schema JOINs.
 *
 * Architecture:
 * MVP:    NestJS EventEmitter (in-process, synchronous within request cycle)
 * Phase 2: Kafka topics (async, requires idempotent handlers + saga patterns)
 *
 * Design principles:
 * 1. Events describe "what happened" (past tense), NOT "what to do" (imperative)
 * 2. Every handler MUST be idempotent (same event 2x → no side effects)
 * 3. Every event carries its own idempotency key
 * 4. Payload is self-contained — subscriber should NOT need to call back publisher
 * 5. Events are immutable — never modify after publish
 *
 * @module events
 * @see GLOSSARY.md for DE↔EN term mapping
 */

// =============================================================================
// Base Event Type
// =============================================================================

/**
 * Base interface for ALL domain events.
 *
 * Every event in the system extends this. The `eventId` is the primary
 * idempotency key — handlers track processed eventIds to prevent duplicate
 * processing (critical for Kafka Phase 2).
 */
export interface DomainEvent<T extends string = string> {
  /** Unique event ID (UUID v4). Primary idempotency key. */
  eventId: string;
  /** Event type discriminator */
  type: T;
  /** When the event occurred (ISO 8601) */
  timestamp: Date;
  /** Which module published this event */
  sourceModule: SourceModule;
  /** Keycloak user ID that triggered the action (system events use 'SYSTEM') */
  triggeredBy: string;
  /**
   * Correlation ID for tracing related events across modules.
   * All events in a demand lifecycle share the same correlationId.
   * Maps to OpenTelemetry trace ID.
   */
  correlationId: string;
}

export type SourceModule =
  | 'auth'
  | 'demand'
  | 'offer'
  | 'transport'
  | 'contract'
  | 'payment'
  | 'review'
  | 'provider'
  | 'notification';

// =============================================================================
// Auth Module Events (Authentifizierungsereignisse)
// =============================================================================

/**
 * Published when a new user registers via Keycloak.
 * DE: Benutzer registriert
 *
 * Subscribers:
 * - shared schema → creates user_reference record
 */
export interface UserRegisteredEvent extends DomainEvent<'USER_REGISTERED'> {
  payload: {
    userId: string;
    email: string;
    displayName: string;
    role: 'customer' | 'provider';
  };
  /** Idempotency: userId — a user can only register once */
  idempotencyKey: string; // = userId
}

/**
 * Published when user profile is updated (email, display name).
 * DE: Benutzerprofil aktualisiert
 *
 * Subscribers:
 * - shared schema → updates user_reference
 * - notification → if email changed, send verification
 */
export interface UserProfileUpdatedEvent extends DomainEvent<'USER_PROFILE_UPDATED'> {
  payload: {
    userId: string;
    updatedFields: {
      email?: string;
      displayName?: string;
    };
  };
  /** Idempotency: eventId (profile can be updated many times) */
  idempotencyKey: string; // = eventId
}

// =============================================================================
// Demand Module Events (Anfrageereignisse)
// =============================================================================

/**
 * Published when a customer creates and publishes a demand.
 * DE: Umzugsanfrage veröffentlicht
 *
 * This is the starting gun for the marketplace — providers in matching
 * PLZ regions can now submit offers.
 *
 * Subscribers:
 * - offer → allows offer submission for this demand
 * - notification → (Phase 2) notify providers in matching regions
 */
export interface DemandPublishedEvent extends DomainEvent<'DEMAND_PUBLISHED'> {
  payload: {
    demandId: string;
    customerUserId: string;
    serviceType: string;
    transportationId: string;
    /** From/to PLZ for provider region matching */
    fromPostCode: string;
    toPostCode: string;
    /** Estimated volume for provider filtering */
    estimatedVolume: number;
    preferredDateStart: Date;
    preferredDateEnd: Date;
    expiresAt: Date;
  };
  /** Idempotency: demandId — a demand can only be published once */
  idempotencyKey: string; // = demandId
}

/**
 * Published when a customer cancels their demand.
 * DE: Umzugsanfrage storniert
 *
 * Subscribers:
 * - offer → reject/withdraw all pending offers
 * - notification → notify providers who submitted offers
 */
export interface DemandCancelledEvent extends DomainEvent<'DEMAND_CANCELLED'> {
  payload: {
    demandId: string;
    customerUserId: string;
    reason?: string;
  };
  /** Idempotency: demandId — a demand can only be cancelled once */
  idempotencyKey: string; // = `demand:${demandId}:cancelled`
}

/**
 * Published when demand lifecycle is complete (service done, paid, reviewed).
 * DE: Umzugsanfrage abgeschlossen
 *
 * Subscribers:
 * - review → trigger review reminders for both parties
 */
export interface DemandCompletedEvent extends DomainEvent<'DEMAND_COMPLETED'> {
  payload: {
    demandId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    contractId: string;
  };
  /** Idempotency: demandId — a demand can only complete once */
  idempotencyKey: string; // = `demand:${demandId}:completed`
}

/**
 * Published when demand expires without accepted offers.
 * DE: Umzugsanfrage abgelaufen
 *
 * Subscribers:
 * - offer → expire all pending offers for this demand
 * - notification → notify customer
 */
export interface DemandExpiredEvent extends DomainEvent<'DEMAND_EXPIRED'> {
  payload: {
    demandId: string;
    customerUserId: string;
    offerCount: number;
  };
  /** Idempotency: demandId — a demand can only expire once */
  idempotencyKey: string; // = `demand:${demandId}:expired`
}

// =============================================================================
// Offer Module Events (Angebotsereignisse)
// =============================================================================

/**
 * Published when a provider submits an offer for a demand.
 * DE: Angebot eingereicht
 *
 * Subscribers:
 * - demand → increment offerCount
 * - notification → email customer "Neues Angebot erhalten"
 */
export interface OfferSubmittedEvent extends DomainEvent<'OFFER_SUBMITTED'> {
  payload: {
    offerId: string;
    demandId: string;
    providerUserId: string;
    providerCompanyId: string;
    /** Total offered price (for demand stats) */
    totalPrice: { amount: number; currency: 'EUR' };
    validUntil: Date;
  };
  /** Idempotency: offerId — an offer can only be submitted once */
  idempotencyKey: string; // = offerId
}

/**
 * Published when a provider withdraws their offer.
 * DE: Angebot zurückgezogen
 *
 * Subscribers:
 * - demand → decrement offerCount
 * - notification → (optional) notify customer
 */
export interface OfferWithdrawnEvent extends DomainEvent<'OFFER_WITHDRAWN'> {
  payload: {
    offerId: string;
    demandId: string;
    providerUserId: string;
  };
  /** Idempotency: offerId + withdrawn — an offer can only be withdrawn once */
  idempotencyKey: string; // = `offer:${offerId}:withdrawn`
}

/**
 * *** CRITICAL EVENT ***
 *
 * Published when a customer accepts a provider's offer.
 * DE: Angebot angenommen
 *
 * This is the most important event in the demand lifecycle.
 * It triggers a cascade:
 * 1. demand → set acceptedOfferId, status = ACCEPTED
 * 2. contract → create new Contract in DRAFT status
 * 3. offer → reject all other pending offers for this demand
 * 4. notification → email provider "Angebot angenommen"
 * 5. notification → email customer "Vertrag zur Bestätigung"
 *
 * Event ordering: OFFER_ACCEPTED → DEMAND_STATUS_CHANGED(ACCEPTED)
 *                                → CONTRACT_CREATED(DRAFT)
 *                                → OTHER_OFFERS_REJECTED
 */
export interface OfferAcceptedEvent extends DomainEvent<'OFFER_ACCEPTED'> {
  payload: {
    offerId: string;
    demandId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    /** Agreed price details — needed by contract module */
    totalPrice: { amount: number; currency: 'EUR' };
    commissionAmount: { amount: number; currency: 'EUR' };
    commissionRate: number;
    providerNetAmount: { amount: number; currency: 'EUR' };
    vatAmount: { amount: number; currency: 'EUR' };
    vatRate: number;
    /** Offer message and breakdown — included in contract */
    message?: string;
    priceBreakdown?: {
      baseTransportPrice: { amount: number; currency: 'EUR' };
      assemblyCost?: { amount: number; currency: 'EUR' };
      kitchenCost?: { amount: number; currency: 'EUR' };
      packingCost?: { amount: number; currency: 'EUR' };
      halteverbotCost?: { amount: number; currency: 'EUR' };
    };
    /** Transport reference — needed by contract for service description */
    transportationId: string;
  };
  /** Idempotency: offerId + accepted — an offer can only be accepted once */
  idempotencyKey: string; // = `offer:${offerId}:accepted`
}

/**
 * Published when a customer rejects an offer.
 * DE: Angebot abgelehnt
 *
 * Subscribers:
 * - notification → email provider "Angebot abgelehnt"
 */
export interface OfferRejectedEvent extends DomainEvent<'OFFER_REJECTED'> {
  payload: {
    offerId: string;
    demandId: string;
    providerUserId: string;
    providerCompanyId: string;
  };
  /** Idempotency: offerId + rejected */
  idempotencyKey: string; // = `offer:${offerId}:rejected`
}

/**
 * Published when an offer expires (validUntil passed).
 * DE: Angebot abgelaufen
 *
 * Subscribers:
 * - demand → decrement offerCount
 * - notification → (optional) notify provider
 */
export interface OfferExpiredEvent extends DomainEvent<'OFFER_EXPIRED'> {
  payload: {
    offerId: string;
    demandId: string;
    providerUserId: string;
  };
  /** Idempotency: offerId + expired */
  idempotencyKey: string; // = `offer:${offerId}:expired`
}

/**
 * Published when offer aggregate stats change for a demand.
 * DE: Angebotsstatistik aktualisiert
 *
 * Subscribers:
 * - demand → denormalize offer stats (min/max/avg price, count)
 */
export interface OfferStatsUpdatedEvent extends DomainEvent<'OFFER_STATS_UPDATED'> {
  payload: {
    demandId: string;
    offerCount: number;
    minPrice: { amount: number; currency: 'EUR' };
    maxPrice: { amount: number; currency: 'EUR' };
    averagePrice: { amount: number; currency: 'EUR' };
  };
  /** Idempotency: eventId (stats update on every offer change) */
  idempotencyKey: string; // = eventId
}

// =============================================================================
// Contract Module Events (Vertragsereignisse)
// =============================================================================

/**
 * Published when a new contract is auto-created from an accepted offer.
 * DE: Vertrag erstellt (Entwurf)
 *
 * Subscribers:
 * - notification → email both parties "Vertrag zur Bestätigung"
 */
export interface ContractCreatedEvent extends DomainEvent<'CONTRACT_CREATED'> {
  payload: {
    contractId: string;
    demandId: string;
    offerId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    agreedPrice: { amount: number; currency: 'EUR' };
    serviceDate: Date;
  };
  /** Idempotency: offerId — one contract per accepted offer */
  idempotencyKey: string; // = `contract:offer:${offerId}`
}

/**
 * Published when the customer accepts the contract.
 * DE: Vertrag vom Kunden bestätigt
 *
 * Subscribers:
 * - notification → email provider "Kunde hat Vertrag bestätigt"
 *
 * Note: if provider already accepted → triggers CONTRACT_ACTIVE
 */
export interface ContractCustomerAcceptedEvent extends DomainEvent<'CONTRACT_CUSTOMER_ACCEPTED'> {
  payload: {
    contractId: string;
    customerUserId: string;
    acceptedAt: Date;
  };
  /** Idempotency: contractId + customer_accepted */
  idempotencyKey: string; // = `contract:${contractId}:customer_accepted`
}

/**
 * Published when the provider accepts the contract.
 * DE: Vertrag vom Anbieter bestätigt
 *
 * Subscribers:
 * - notification → email customer "Anbieter hat Vertrag bestätigt"
 *
 * Note: if customer already accepted → triggers CONTRACT_ACTIVE
 */
export interface ContractProviderAcceptedEvent extends DomainEvent<'CONTRACT_PROVIDER_ACCEPTED'> {
  payload: {
    contractId: string;
    providerUserId: string;
    acceptedAt: Date;
  };
  /** Idempotency: contractId + provider_accepted */
  idempotencyKey: string; // = `contract:${contractId}:provider_accepted`
}

/**
 * *** CRITICAL EVENT ***
 *
 * Published when BOTH parties have accepted the contract.
 * DE: Vertrag aktiv — beidseitig bestätigt
 *
 * Triggers:
 * 1. Contract module generates timestamped PDF
 * 2. Payment module creates checkout session
 * 3. Demand status → IN_PROGRESS
 *
 * Event ordering: CONTRACT_ACTIVE → CONTRACT_PDF_GENERATED
 *                                 → PAYMENT_CHECKOUT_CREATED
 *
 * Subscribers:
 * - payment → create checkout session for customer
 * - demand → status = IN_PROGRESS
 * - notification → email both "Vertrag bestätigt"
 */
export interface ContractActiveEvent extends DomainEvent<'CONTRACT_ACTIVE'> {
  payload: {
    contractId: string;
    demandId: string;
    offerId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    agreedPrice: { amount: number; currency: 'EUR' };
    commissionAmount: { amount: number; currency: 'EUR' };
    providerNetAmount: { amount: number; currency: 'EUR' };
    vatAmount: { amount: number; currency: 'EUR' };
    serviceDate: Date;
    /** Provider's Stripe Connected Account for payment split */
    providerStripeAccountId: string;
  };
  /** Idempotency: contractId + active */
  idempotencyKey: string; // = `contract:${contractId}:active`
}

/**
 * Published when the contract PDF is generated.
 * DE: Vertragsdokument erstellt
 *
 * Subscribers:
 * - notification → email both parties with PDF attachment
 */
export interface ContractPdfGeneratedEvent extends DomainEvent<'CONTRACT_PDF_GENERATED'> {
  payload: {
    contractId: string;
    customerUserId: string;
    providerUserId: string;
    pdfStorageKey: string;
    generatedAt: Date;
  };
  /** Idempotency: contractId + pdf (one PDF per contract) */
  idempotencyKey: string; // = `contract:${contractId}:pdf`
}

/**
 * Published when a contract is cancelled by either party.
 * DE: Vertrag storniert
 *
 * Subscribers:
 * - demand → status = CANCELLED or reopen
 * - payment → refund if payment was made
 * - notification → email both parties
 */
export interface ContractCancelledEvent extends DomainEvent<'CONTRACT_CANCELLED'> {
  payload: {
    contractId: string;
    demandId: string;
    customerUserId: string;
    providerUserId: string;
    cancelledBy: string; // userId
    reason?: string;
    /** Was payment already completed? Determines if refund needed */
    paymentCompleted: boolean;
  };
  /** Idempotency: contractId + cancelled */
  idempotencyKey: string; // = `contract:${contractId}:cancelled`
}

/**
 * Published when contract is fulfilled (service completed).
 * DE: Vertrag erfüllt — Dienstleistung abgeschlossen
 *
 * Triggers the post-service flow:
 * 1. Payment → release provider payout
 * 2. Demand → status = COMPLETED
 * 3. Review → create review requests for both parties
 *
 * Event ordering: CONTRACT_FULFILLED → PAYMENT (payout)
 *                                    → DEMAND_COMPLETED
 *                                    → REVIEW reminders (after delay)
 *
 * Subscribers:
 * - payment → transfer provider payout
 * - demand → status = COMPLETED
 * - review → schedule review reminders
 * - notification → email both "Umzug abgeschlossen"
 */
export interface ContractFulfilledEvent extends DomainEvent<'CONTRACT_FULFILLED'> {
  payload: {
    contractId: string;
    demandId: string;
    offerId: string;
    customerUserId: string;
    providerUserId: string;
    providerCompanyId: string;
    /** Payment transaction to trigger payout */
    paymentTransactionId: string;
    completedAt: Date;
  };
  /** Idempotency: contractId + fulfilled */
  idempotencyKey: string; // = `contract:${contractId}:fulfilled`
}

// =============================================================================
// Payment Module Events (Zahlungsereignisse)
// =============================================================================

/**
 * Published when a Stripe Checkout session is created for the customer.
 * DE: Zahlungsvorgang gestartet
 *
 * Subscribers:
 * - (none in MVP — frontend polls or receives checkout URL directly)
 */
export interface PaymentCheckoutCreatedEvent extends DomainEvent<'PAYMENT_CHECKOUT_CREATED'> {
  payload: {
    transactionId: string;
    contractId: string;
    demandId: string;
    customerUserId: string;
    checkoutUrl: string;
    expiresAt: Date;
  };
  /** Idempotency: contractId + checkout (one checkout per contract) */
  idempotencyKey: string; // = `payment:${contractId}:checkout`
}

/**
 * *** CRITICAL EVENT ***
 *
 * Published when Stripe confirms payment (webhook: payment_intent.succeeded).
 * DE: Zahlung eingegangen
 *
 * Subscribers:
 * - contract → update payment status
 * - demand → status update if needed
 * - notification → email customer "Zahlung eingegangen"
 * - notification → email provider "Zahlung für Auftrag bestätigt"
 */
export interface PaymentCompletedEvent extends DomainEvent<'PAYMENT_COMPLETED'> {
  payload: {
    transactionId: string;
    contractId: string;
    demandId: string;
    customerUserId: string;
    providerUserId: string;
    totalAmount: { amount: number; currency: 'EUR' };
    commissionAmount: { amount: number; currency: 'EUR' };
    providerNetAmount: { amount: number; currency: 'EUR' };
    stripePaymentIntentId: string;
    completedAt: Date;
  };
  /** Idempotency: stripePaymentIntentId — Stripe guarantees uniqueness */
  idempotencyKey: string; // = stripePaymentIntentId
}

/**
 * Published when payment fails.
 * DE: Zahlung fehlgeschlagen
 *
 * Subscribers:
 * - notification → email customer "Zahlung fehlgeschlagen"
 */
export interface PaymentFailedEvent extends DomainEvent<'PAYMENT_FAILED'> {
  payload: {
    transactionId: string;
    contractId: string;
    demandId: string;
    customerUserId: string;
    failureReason: string;
    stripePaymentIntentId?: string;
  };
  /** Idempotency: transactionId + failed */
  idempotencyKey: string; // = `payment:${transactionId}:failed`
}

/**
 * Published when provider payout is transferred via Stripe Connect.
 * DE: Auszahlung an Anbieter überwiesen
 *
 * Subscribers:
 * - provider → update completed job count
 * - notification → email provider "Auszahlung überwiesen"
 */
export interface ProviderPayoutCompletedEvent extends DomainEvent<'PROVIDER_PAYOUT_COMPLETED'> {
  payload: {
    transactionId: string;
    contractId: string;
    providerUserId: string;
    providerCompanyId: string;
    amount: { amount: number; currency: 'EUR' };
    stripeTransferId: string;
    transferredAt: Date;
  };
  /** Idempotency: stripeTransferId — Stripe guarantees uniqueness */
  idempotencyKey: string; // = stripeTransferId
}

/**
 * Published when a refund is processed.
 * DE: Erstattung abgeschlossen
 *
 * Subscribers:
 * - notification → email customer "Erstattung erfolgt"
 */
export interface RefundCompletedEvent extends DomainEvent<'REFUND_COMPLETED'> {
  payload: {
    transactionId: string;
    originalTransactionId: string;
    contractId: string;
    customerUserId: string;
    amount: { amount: number; currency: 'EUR' };
    refundedAt: Date;
  };
  /** Idempotency: transactionId (refund transaction) */
  idempotencyKey: string; // = transactionId
}

/**
 * Published when provider deposit is received.
 * DE: Kaution eingegangen
 *
 * Subscribers:
 * - provider → status = ACTIVE, update depositAmount + depositPaidAt
 * - notification → email provider "Konto aktiviert"
 */
export interface DepositReceivedEvent extends DomainEvent<'DEPOSIT_RECEIVED'> {
  payload: {
    transactionId: string;
    providerUserId: string;
    providerCompanyId: string;
    amount: { amount: number; currency: 'EUR' };
    stripePaymentIntentId: string;
    receivedAt: Date;
  };
  /** Idempotency: providerCompanyId + deposit (one deposit per company) */
  idempotencyKey: string; // = `deposit:${providerCompanyId}`
}

// =============================================================================
// Provider Module Events (Anbieterereignisse)
// =============================================================================

/**
 * Published when a provider company is registered (profile created, pending deposit).
 * DE: Anbieter registriert
 *
 * Subscribers:
 * - notification → email provider with onboarding instructions
 */
export interface ProviderRegisteredEvent extends DomainEvent<'PROVIDER_REGISTERED'> {
  payload: {
    companyId: string;
    ownerUserId: string;
    companyName: string;
    supportedPostCodePrefixes: string[];
  };
  /** Idempotency: companyId */
  idempotencyKey: string; // = companyId
}

/**
 * Published when a provider becomes ACTIVE (deposit paid, profile complete).
 * DE: Anbieter aktiviert
 *
 * Subscribers:
 * - notification → email provider "Konto aktiviert — Sie können jetzt Angebote abgeben"
 */
export interface ProviderActivatedEvent extends DomainEvent<'PROVIDER_ACTIVATED'> {
  payload: {
    companyId: string;
    ownerUserId: string;
    stripeConnectedAccountId: string;
  };
  /** Idempotency: companyId + activated */
  idempotencyKey: string; // = `provider:${companyId}:activated`
}

/**
 * Published when a provider is suspended (bad reviews, breach of contract).
 * DE: Anbieter gesperrt
 *
 * Subscribers:
 * - offer → withdraw all pending offers from this provider
 * - notification → email provider "Konto gesperrt"
 */
export interface ProviderSuspendedEvent extends DomainEvent<'PROVIDER_SUSPENDED'> {
  payload: {
    companyId: string;
    ownerUserId: string;
    reason: string;
    suspendedBy: string; // admin userId
  };
  /** Idempotency: companyId + suspended + timestamp */
  idempotencyKey: string; // = `provider:${companyId}:suspended:${timestamp}`
}

// =============================================================================
// Transport Module Events (Transportereignisse)
// =============================================================================

/**
 * Published when transport record is created (during demand creation).
 * DE: Transport erstellt
 *
 * Subscribers:
 * - demand → store transportationId reference
 */
export interface TransportCreatedEvent extends DomainEvent<'TRANSPORT_CREATED'> {
  payload: {
    transportationId: string;
    fromPostCode: string;
    toPostCode: string;
    estimatedVolume: number;
    estimatedDistanceKm: number;
    preferredDateStart: Date;
    preferredDateEnd: Date;
  };
  /** Idempotency: transportationId */
  idempotencyKey: string; // = transportationId
}

/**
 * Published when volume calculation completes after furniture selection.
 * DE: Ladevolumen berechnet
 *
 * Subscribers:
 * - (informational — may be used by offer module for provider display)
 */
export interface TransportVolumeCalculatedEvent extends DomainEvent<'TRANSPORT_VOLUME_CALCULATED'> {
  payload: {
    transportationId: string;
    totalVolume: number; // m³
    totalFurnitureItems: number;
    assemblyRequired: boolean;
    kitchenMontageRequired: boolean;
  };
  /** Idempotency: eventId (volume recalculated on each furniture change) */
  idempotencyKey: string; // = eventId
}

// =============================================================================
// Review Module Events (Bewertungsereignisse)
// =============================================================================

/**
 * Published when a review is submitted by either party.
 * DE: Bewertung abgegeben
 *
 * Subscribers:
 * - provider → update averageRating, reviewCount (denormalization)
 * - notification → email reviewee "Neue Bewertung erhalten"
 */
export interface ReviewSubmittedEvent extends DomainEvent<'REVIEW_SUBMITTED'> {
  payload: {
    reviewId: string;
    demandId: string;
    contractId: string;
    reviewerUserId: string;
    revieweeUserId: string;
    direction: 'CUSTOMER_TO_PROVIDER' | 'PROVIDER_TO_CUSTOMER';
    rating: number; // 1-5
    /** Aspect ratings included for provider aggregate calculation */
    aspectRatings?: { aspect: string; rating: number }[];
  };
  /** Idempotency: contractId + direction (one review per direction per contract) */
  idempotencyKey: string; // = `review:${contractId}:${direction}`
}

/**
 * Published when review aggregates are recalculated.
 * DE: Bewertungsstatistik aktualisiert
 *
 * Subscribers:
 * - provider → denormalize averageRating, reviewCount on ProviderCompany
 */
export interface ReviewAggregateUpdatedEvent extends DomainEvent<'REVIEW_AGGREGATE_UPDATED'> {
  payload: {
    revieweeUserId: string;
    direction: 'CUSTOMER_TO_PROVIDER' | 'PROVIDER_TO_CUSTOMER';
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  /** Idempotency: eventId (recalculated on every review) */
  idempotencyKey: string; // = eventId
}

// =============================================================================
// Union Types (All Events)
// =============================================================================

/**
 * Union of all domain events.
 * Use for generic event bus typing.
 */
export type CdsDomainEvent =
  // Auth
  | UserRegisteredEvent
  | UserProfileUpdatedEvent
  // Demand
  | DemandPublishedEvent
  | DemandCancelledEvent
  | DemandCompletedEvent
  | DemandExpiredEvent
  // Offer
  | OfferSubmittedEvent
  | OfferWithdrawnEvent
  | OfferAcceptedEvent
  | OfferRejectedEvent
  | OfferExpiredEvent
  | OfferStatsUpdatedEvent
  // Contract
  | ContractCreatedEvent
  | ContractCustomerAcceptedEvent
  | ContractProviderAcceptedEvent
  | ContractActiveEvent
  | ContractPdfGeneratedEvent
  | ContractCancelledEvent
  | ContractFulfilledEvent
  // Payment
  | PaymentCheckoutCreatedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | ProviderPayoutCompletedEvent
  | RefundCompletedEvent
  | DepositReceivedEvent
  // Provider
  | ProviderRegisteredEvent
  | ProviderActivatedEvent
  | ProviderSuspendedEvent
  // Transport
  | TransportCreatedEvent
  | TransportVolumeCalculatedEvent
  // Review
  | ReviewSubmittedEvent
  | ReviewAggregateUpdatedEvent;

/**
 * All event type discriminator strings.
 * Useful for event bus registration and switch statements.
 */
export type CdsEventType = CdsDomainEvent['type'];

// =============================================================================
// Publisher → Subscriber Mapping
// =============================================================================

/**
 * PUBLISHER → SUBSCRIBER MAPPING TABLE
 *
 * Read as: "When [publisher] emits [event], [subscribers] react."
 *
 * ┌─────────────┬──────────────────────────────┬─────────────────────────────────────┐
 * │ Publisher    │ Event                        │ Subscribers                         │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ auth        │ USER_REGISTERED              │ shared (user_reference)             │
 * │ auth        │ USER_PROFILE_UPDATED         │ shared, notification                │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ demand      │ DEMAND_PUBLISHED             │ offer, notification*                │
 * │ demand      │ DEMAND_CANCELLED             │ offer, notification                 │
 * │ demand      │ DEMAND_COMPLETED             │ review                              │
 * │ demand      │ DEMAND_EXPIRED               │ offer, notification                 │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ offer       │ OFFER_SUBMITTED              │ demand, notification                │
 * │ offer       │ OFFER_WITHDRAWN              │ demand                              │
 * │ offer       │ OFFER_ACCEPTED ★             │ demand, contract, offer, notif.     │
 * │ offer       │ OFFER_REJECTED               │ notification                        │
 * │ offer       │ OFFER_EXPIRED                │ demand                              │
 * │ offer       │ OFFER_STATS_UPDATED          │ demand                              │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ contract    │ CONTRACT_CREATED             │ notification                        │
 * │ contract    │ CONTRACT_CUSTOMER_ACCEPTED   │ notification                        │
 * │ contract    │ CONTRACT_PROVIDER_ACCEPTED   │ notification                        │
 * │ contract    │ CONTRACT_ACTIVE ★            │ payment, demand, notification       │
 * │ contract    │ CONTRACT_PDF_GENERATED       │ notification                        │
 * │ contract    │ CONTRACT_CANCELLED           │ demand, payment, notification       │
 * │ contract    │ CONTRACT_FULFILLED ★         │ payment, demand, review, notif.     │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ payment     │ PAYMENT_CHECKOUT_CREATED     │ (none — frontend receives URL)      │
 * │ payment     │ PAYMENT_COMPLETED ★          │ contract, demand, notification      │
 * │ payment     │ PAYMENT_FAILED               │ notification                        │
 * │ payment     │ PROVIDER_PAYOUT_COMPLETED    │ provider, notification              │
 * │ payment     │ REFUND_COMPLETED             │ notification                        │
 * │ payment     │ DEPOSIT_RECEIVED             │ provider, notification              │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ provider    │ PROVIDER_REGISTERED          │ notification                        │
 * │ provider    │ PROVIDER_ACTIVATED           │ notification                        │
 * │ provider    │ PROVIDER_SUSPENDED           │ offer, notification                 │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ transport   │ TRANSPORT_CREATED            │ demand                              │
 * │ transport   │ TRANSPORT_VOLUME_CALCULATED  │ (informational)                     │
 * ├─────────────┼──────────────────────────────┼─────────────────────────────────────┤
 * │ review      │ REVIEW_SUBMITTED             │ provider, notification              │
 * │ review      │ REVIEW_AGGREGATE_UPDATED     │ provider                            │
 * └─────────────┴──────────────────────────────┴─────────────────────────────────────┘
 *
 * ★ = Critical events (cascade triggers, ordering matters)
 * * = Phase 2 (provider region matching for demand notifications)
 *
 * notification module is a PURE subscriber — it never publishes events.
 */

// =============================================================================
// Event Ordering Constraints (Ereignisreihenfolge)
// =============================================================================

/**
 * EVENT ORDERING — DEMAND LIFECYCLE
 *
 * Happy path (complete lifecycle):
 *
 * DEMAND_PUBLISHED
 *   └→ OFFER_SUBMITTED (1..n offers)
 *       └→ OFFER_ACCEPTED (exactly 1)
 *           ├→ OTHER OFFERS: OFFER_REJECTED / OFFER_WITHDRAWN
 *           └→ CONTRACT_CREATED (DRAFT)
 *               ├→ CONTRACT_CUSTOMER_ACCEPTED
 *               └→ CONTRACT_PROVIDER_ACCEPTED
 *                   └→ CONTRACT_ACTIVE (both accepted)
 *                       ├→ CONTRACT_PDF_GENERATED
 *                       └→ PAYMENT_CHECKOUT_CREATED
 *                           └→ PAYMENT_COMPLETED
 *                               └→ CONTRACT_FULFILLED (after service)
 *                                   ├→ PROVIDER_PAYOUT_COMPLETED
 *                                   ├→ DEMAND_COMPLETED
 *                                   └→ REVIEW_SUBMITTED (0..2, after delay)
 *                                       └→ REVIEW_AGGREGATE_UPDATED
 *
 * Cancellation paths:
 *
 * DEMAND_PUBLISHED → DEMAND_CANCELLED (customer cancels before accepting)
 * DEMAND_PUBLISHED → DEMAND_EXPIRED (no offers or no accepted offer)
 * CONTRACT_CREATED → CONTRACT_CANCELLED (either party cancels before both accept)
 * CONTRACT_ACTIVE  → CONTRACT_CANCELLED (after both accept, before fulfillment)
 *   └→ REFUND_COMPLETED (if payment was made)
 *
 * Provider onboarding path:
 *
 * PROVIDER_REGISTERED → DEPOSIT_RECEIVED → PROVIDER_ACTIVATED
 *                                        → can now: OFFER_SUBMITTED
 *
 * Error/retry path:
 *
 * PAYMENT_CHECKOUT_CREATED → PAYMENT_FAILED → (customer retries)
 *                                            → PAYMENT_CHECKOUT_CREATED (new session)
 */

// =============================================================================
// Idempotency Convention
// =============================================================================

/**
 * IDEMPOTENCY KEY CONVENTION
 *
 * Every event handler MUST check if the idempotency key was already processed
 * before applying side effects.
 *
 * MVP implementation (NestJS EventEmitter, in-process):
 * - Each module maintains a `processed_events` table in its own schema
 * - Before handling: SELECT FROM processed_events WHERE key = :idempotencyKey
 * - After handling:  INSERT INTO processed_events (key, event_id, processed_at)
 * - Wrap in transaction with the actual side effect
 *
 * Table schema (per module):
 * ```sql
 * CREATE TABLE <module>.processed_events (
 *   idempotency_key TEXT PRIMARY KEY,
 *   event_id UUID NOT NULL,
 *   event_type TEXT NOT NULL,
 *   processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * ```
 *
 * Phase 2 (Kafka):
 * - Consumer group per module ensures at-least-once delivery
 * - Idempotency check prevents duplicate processing
 * - Consider: Kafka exactly-once semantics (EOS) with transactional producer
 *
 * Idempotency key patterns:
 * - Entity-based:  `offer:${offerId}:accepted` — one-time state transition
 * - Composite:     `review:${contractId}:${direction}` — uniqueness constraint
 * - External:      `${stripePaymentIntentId}` — external system guarantees uniqueness
 * - Event-based:   `${eventId}` — for events that can repeat (stats updates)
 */
