/**
 * CDS Platform — Contract Types (Vertrag)
 *
 * Digital service contracts between customer and provider.
 * MVP: mutual acceptance + timestamped PDF. Phase 1.5: qualified e-signature.
 *
 * Lives in: contract schema
 * OAK source: NONE — this is a new CDS concept.
 *
 * @module contract
 */

import { BaseEntity, ContractStatus, Money, PII } from './core-types';

// =============================================================================
// Contract (Vertrag / Dienstleistungsvertrag)
// =============================================================================

/**
 * A service contract between customer and provider.
 * DE: Dienstleistungsvertrag / Umzugsvertrag
 *
 * CDS addition — not in OAK.
 * This is a CDS differentiator: legally-structured contracts, not just "accept offer" buttons.
 *
 * MVP flow:
 * 1. Offer accepted → Contract auto-generated (DRAFT)
 * 2. Customer clicks "Ich akzeptiere" → CUSTOMER_ACCEPTED
 * 3. Provider clicks "Ich akzeptiere" → ACTIVE (both accepted)
 * 4. System generates timestamped PDF → emailed to both parties
 * 5. Job completes → FULFILLED
 *
 * Phase 1.5: qualified electronic signature (eIDAS compliant)
 */
export interface Contract extends BaseEntity {
  /** Reference to the demand */
  demandId: string;
  /** Reference to the accepted offer */
  offerId: string;

  /** Customer user ID — @pii (contract party) */
  customerUserId: string;
  /** Provider user ID */
  providerUserId: string;
  /** Provider company ID */
  providerCompanyId: string;

  /** Contract lifecycle status. DE: Vertragsstatus */
  status: ContractStatus;

  // --- Contract Terms (Vertragsbedingungen) ---

  /**
   * Agreed total price (from the accepted offer).
   * DE: Vereinbarter Gesamtpreis
   */
  agreedPrice: Money;

  /**
   * Platform commission amount.
   * DE: Plattformgebühr
   */
  commissionAmount: Money;

  /**
   * VAT amount. DE: MwSt
   */
  vatAmount: Money;

  /**
   * Agreed service date. DE: Vereinbarter Umzugstermin
   */
  serviceDate: Date;

  /**
   * Service description — auto-generated summary of what was agreed.
   * DE: Leistungsbeschreibung
   * Includes: from/to addresses, estate types, furniture summary, services.
   */
  serviceDescription: string;

  // --- Acceptance timestamps ---

  /** When customer accepted. DE: Kundenakzeptanz */
  customerAcceptedAt?: Date;
  /** When provider accepted. DE: Anbieterakzeptanz */
  providerAcceptedAt?: Date;

  // --- PDF Document ---

  /**
   * Storage reference to the generated PDF contract.
   * Generated when both parties accept.
   */
  pdfStorageKey?: string;
  /** When PDF was generated */
  pdfGeneratedAt?: Date;

  // --- Cancellation ---

  /** If cancelled, who cancelled */
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
}

// =============================================================================
// Contract Template (Vertragsvorlage)
// =============================================================================

/**
 * Template for generating contract PDFs.
 * DE: Vertragsvorlage
 *
 * MVP: one default template per locale.
 * Future: templates per service type, per region, etc.
 */
export interface ContractTemplate extends BaseEntity {
  /** Template name */
  name: string;
  /** Locale this template is for (e.g., 'de') */
  locale: string;
  /** HTML template with placeholders */
  htmlTemplate: string;
  /** Whether this is the default template for the locale */
  isDefault: boolean;
}
