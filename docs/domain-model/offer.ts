/**
 * CDS Platform — Offer Types (Angebot)
 *
 * Offers represent a provider's bid on a customer's demand.
 * This is the marketplace mechanism — multiple providers compete on price/quality.
 *
 * Lives in: offer schema
 * OAK source: OAK.Model.BusinessModels.CompanyModels.CompanyDemandService
 *
 * @module offer
 */

import { BaseEntity, OfferStatus, Money } from './core-types';

// =============================================================================
// Offer (Angebot)
// =============================================================================

/**
 * A provider's offer on a demand.
 * DE: Angebot
 *
 * OAK equivalent: OAK.Model.BusinessModels.CompanyModels.CompanyDemandService
 * OAK had: CompanyId + DemandId + OfferAmount (minimal)
 *
 * CDS additions:
 * - Explicit status lifecycle (OAK derived from DemandStatusType)
 * - Commission breakdown (transparency — CDS core principle)
 * - Validity period
 * - Optional message to customer
 * - Price breakdown (service + extras)
 */
export interface Offer extends BaseEntity {
  /** Reference to the demand (cross-schema UUID) */
  demandId: string;
  /** Provider who made this offer (cross-schema UUID) */
  providerUserId: string;
  /** Provider's company ID */
  providerCompanyId: string;

  /** Current status. DE: Angebotsstatus */
  status: OfferStatus;

  // --- Pricing (Preisgestaltung) ---

  /**
   * Total offered price (what the customer pays).
   * DE: Angebotspreis
   *
   * OAK equivalent: CompanyDemandService.OfferAmount
   */
  totalPrice: Money;

  /**
   * Platform commission on this offer.
   * DE: Plattformgebühr
   *
   * Calculated as: totalPrice × commissionRate.
   * CDS target: 3-5% commission.
   *
   * OAK had: Demand.DemandCommission — but it was on the demand, not the offer.
   * We move it here because commission is per-offer, calculated at offer time.
   */
  commissionAmount: Money;

  /**
   * Commission rate applied (e.g., 0.03 = 3%).
   * Stored per offer for audit trail — rate might change over time.
   */
  commissionRate: number;

  /**
   * Net amount provider receives = totalPrice - commissionAmount.
   * DE: Nettobetrag für Anbieter
   */
  providerNetAmount: Money;

  /**
   * VAT amount.
   * DE: Mehrwertsteuer (MwSt)
   *
   * OAK equivalent: Demand.DemandVAT
   * Germany: 19% standard rate.
   */
  vatAmount: Money;
  vatRate: number;

  // --- Offer details ---

  /**
   * Optional message from provider to customer.
   * DE: Nachricht an den Kunden
   *
   * Allows providers to explain their offer, availability, special conditions.
   */
  message?: string;

  /**
   * When the offer was submitted.
   * Different from createdAt — offer might be drafted before submission.
   */
  submittedAt?: Date;

  /** When the offer expires (auto-reject after this). DE: Gültig bis */
  validUntil: Date;

  /**
   * Optional price breakdown for services.
   * DE: Preisaufschlüsselung
   */
  priceBreakdown?: OfferPriceBreakdown;
}

/**
 * Detailed price breakdown of an offer.
 * DE: Preisaufschlüsselung
 *
 * CDS addition — OAK only had a single OfferAmount.
 * Transparency is a CDS core value — customers should see what they pay for.
 */
export interface OfferPriceBreakdown {
  /** Base transport price. DE: Transportgrundpreis */
  baseTransportPrice: Money;
  /** Furniture assembly/disassembly cost. DE: Montagekosten */
  assemblyCost?: Money;
  /** Kitchen assembly/disassembly cost. DE: Küchenkosten */
  kitchenCost?: Money;
  /** Packing service cost. DE: Verpackungskosten */
  packingCost?: Money;
  /** Halteverbot arrangement cost. DE: Halteverbotkosten */
  halteverbotCost?: Money;
  /** Any additional charges */
  additionalCharges?: { description: string; amount: Money }[];
}

// =============================================================================
// Offer Statistics (Angebotsstatistiken)
// =============================================================================

/**
 * Aggregated offer statistics for a demand.
 * Published as events to the demand module for denormalization.
 *
 * OAK equivalent: Demand.DemandMaxOfferedValue, DemandMinOfferedValue,
 *                  DemandAverageOfferedValue, DemandNumberOfOffers
 * We move these from the demand entity to a separate stats concept.
 */
export interface OfferStats {
  demandId: string;
  offerCount: number;
  minPrice: Money;
  maxPrice: Money;
  averagePrice: Money;
}
