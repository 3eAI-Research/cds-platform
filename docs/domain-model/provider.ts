/**
 * CDS Platform — Provider Types (Umzugsunternehmen)
 *
 * Provider = moving company that offers services on the platform.
 * CDS key differentiator: deposit/stake mechanism for economic regulation.
 *
 * Lives in: provider schema
 * OAK source: OAK.Model.BusinessModels.CompanyModels.*
 *
 * @module provider
 */

import { AuditableEntity, ProviderStatus, Money, PII } from './core-types';

// =============================================================================
// Provider Company (Umzugsunternehmen)
// =============================================================================

/**
 * A moving company registered on the CDS platform.
 * DE: Umzugsunternehmen / Anbieter
 *
 * OAK equivalent: OAK.Model.BusinessModels.CompanyModels.Company
 *
 * Changes from OAK:
 * - Added: deposit/stake fields (CDS core mechanism)
 * - Added: Stripe Connect account reference
 * - Added: service coverage (supported PLZ ranges)
 * - Added: rating aggregates (from review module events)
 * - Removed: CompanyPostCodeData separate entity → embedded supportedRegions
 * - Removed: Guid field (we use UUID id)
 * - Auth handled by Keycloak, not custom
 *
 * Onboarding flow:
 * Register → Complete profile → Pay deposit → ACTIVE → Can submit offers
 */
export interface ProviderCompany extends AuditableEntity {
  /** Keycloak user ID of the company owner/admin */
  ownerUserId: string;

  /** Company name. DE: Firmenname — @pii (company names can be personal) */
  name: PII<string>;
  /** Contact email. DE: Kontakt-E-Mail — @pii */
  email: PII<string>;
  /** Contact phone. DE: Telefonnummer — @pii */
  phoneNumber: PII<string>;
  /** Tax identification number. DE: Steuernummer / USt-IdNr. — @pii */
  taxNumber: PII<string>;

  /** Company status in onboarding/lifecycle. DE: Anbieterstatus */
  status: ProviderStatus;

  // --- Address ---
  /** Company address ID (reference to address in transport schema or own address record) */
  addressId: string;

  // --- Deposit/Stake (Kaution — CDS core mechanism) ---

  /**
   * Deposit amount paid.
   * DE: Kaution / Sicherheitsleistung
   *
   * CDS addition — not in OAK.
   * Deposit = economic regulation. Providers stake real money to participate.
   * If they breach contracts or get consistent bad reviews, deposit is at risk.
   * This replaces bureaucratic oversight with economic incentives.
   */
  depositAmount: Money;
  /** When deposit was paid */
  depositPaidAt?: Date;
  /** Stripe PaymentIntent/SetupIntent ID for the deposit */
  depositPaymentReference?: string;

  // --- Payment (Stripe Connect) ---

  /**
   * Stripe Connected Account ID.
   * Used for receiving payouts from customer payments.
   * Created during onboarding via Stripe Connect.
   */
  stripeConnectedAccountId?: string;

  // --- Service Coverage (Einsatzgebiet) ---

  /**
   * PLZ ranges this provider serves.
   * DE: Einsatzgebiet / Unterstützte Regionen
   *
   * OAK equivalent: CompanyPostCodeData / CompanySupportedRegion
   * OAK had a separate entity with int IDs. We simplify to PLZ prefix list.
   *
   * Example: ['40', '41', '42', '45'] = serves Düsseldorf area
   * Alert from Report_de-DE.json: "Derzeit unterstützen wir Postleitzahlen,
   * die mit 40, 41, 42, 43, 44, 45, 46, 58 beginnen."
   */
  supportedPostCodePrefixes: string[];

  // --- Denormalized stats (from review module events) ---

  /** Average rating (1.0-5.0). DE: Durchschnittsbewertung */
  averageRating?: number;
  /** Total number of reviews. DE: Anzahl der Bewertungen */
  reviewCount: number;
  /** Total completed jobs. DE: Abgeschlossene Aufträge */
  completedJobCount: number;
}

// =============================================================================
// Provider Employee (Mitarbeiter)
// =============================================================================

/**
 * An employee of a provider company.
 * DE: Mitarbeiter
 *
 * OAK equivalent: OAK.Model.BusinessModels.CompanyModels.CompanyEmployee
 * MVP: simplified — just links a Keycloak user to a company.
 */
export interface ProviderEmployee extends AuditableEntity {
  companyId: string;
  userId: string;
  role: ProviderEmployeeRole;
}

export enum ProviderEmployeeRole {
  /** Company owner/admin. DE: Inhaber/Admin */
  OWNER = 'OWNER',
  /** Can manage offers and jobs. DE: Disponent */
  DISPATCHER = 'DISPATCHER',
  /** Can view but not modify. DE: Mitarbeiter */
  WORKER = 'WORKER',
}

// =============================================================================
// Provider Documents (Firmendokumente)
// =============================================================================

/**
 * Official document uploaded by a provider (business license, insurance, etc.).
 * DE: Firmendokument
 *
 * OAK equivalent: CompanyOfficialDocument, CompanyPublicDocument
 * We merge into one entity with a type discriminator.
 */
export interface ProviderDocument extends AuditableEntity {
  companyId: string;
  type: ProviderDocumentType;
  /** Storage reference (S3/MinIO path) */
  storageKey: string;
  /** Original filename — @pii (might contain company name) */
  originalFilename: PII<string>;
  /** Verification status */
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export enum ProviderDocumentType {
  /** Gewerbeschein — business license */
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  /** Versicherungsnachweis — insurance certificate */
  INSURANCE = 'INSURANCE',
  /** Handelsregisterauszug — commercial register extract */
  COMMERCIAL_REGISTER = 'COMMERCIAL_REGISTER',
  /** Other official document */
  OTHER = 'OTHER',
}
