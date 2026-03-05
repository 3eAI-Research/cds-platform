/**
 * Domain event types for Sprint 2.
 * MVP: NestJS EventEmitter (in-process, synchronous).
 * Phase 2: Kafka topics.
 *
 * Event naming convention: module.action (lowercase, dot-separated)
 */

export interface DomainEvent<T = unknown> {
  eventId: string;
  type: string;
  timestamp: string;
  sourceModule: string;
  triggeredBy: string;
  correlationId: string;
  payload: T;
  idempotencyKey: string;
}

// --- Event Names (used in @OnEvent decorators) ---

export const DomainEventNames = {
  DEMAND_PUBLISHED: 'demand.published',
  DEMAND_CANCELLED: 'demand.cancelled',
  OFFER_SUBMITTED: 'offer.submitted',
  OFFER_ACCEPTED: 'offer.accepted',
  CONTRACT_CREATED: 'contract.created',
  CONTRACT_ACTIVE: 'contract.active',
} as const;

// --- Event Payloads ---

export interface DemandPublishedPayload {
  demandId: string;
  customerUserId: string;
  serviceType: string;
  transportationId: string;
  status: string;
}

export interface DemandCancelledPayload {
  demandId: string;
  customerUserId: string;
  previousStatus: string;
  reason: string;
}

export interface OfferSubmittedPayload {
  offerId: string;
  demandId: string;
  providerCompanyId: string;
  totalPriceAmount: number;
  commissionAmount: number;
}

export interface OfferAcceptedPayload {
  offerId: string;
  demandId: string;
  providerCompanyId: string;
  providerUserId: string;
  customerUserId: string;
  totalPriceAmount: number;
  commissionAmount: number;
  vatAmount: number;
}

export interface ContractCreatedPayload {
  contractId: string;
  demandId: string;
  offerId: string;
  customerUserId: string;
  providerCompanyId: string;
}

export interface ContractActivePayload {
  contractId: string;
  demandId: string;
  offerId: string;
  customerUserId: string;
  providerCompanyId: string;
}
