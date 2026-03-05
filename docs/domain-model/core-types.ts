/**
 * CDS Platform — Core Types
 *
 * Shared type definitions used across all domain modules.
 * These types form the foundation of the CDS type system.
 *
 * @module core-types
 * @see docs/domain-model/GLOSSARY.md for DE↔EN term mapping
 */

// =============================================================================
// GDPR Data Classification Types
// =============================================================================

/**
 * Marks a field as Personally Identifiable Information (GDPR Article 4).
 * Examples: name, email, address, phone number.
 *
 * Zero runtime overhead — compile-time marker only.
 * Use: grep for PII<> to find all personal data fields across the codebase.
 */
export type PII<T> = T & { readonly __pii: unique symbol };

/**
 * Marks a field as Sensitive Personal Data (GDPR Article 9).
 * Examples: health data, ethnicity, religion, biometric data.
 *
 * NOT used in MVP — reserved for future sectors (healthcare, care services).
 */
export type Sensitive<T> = T & { readonly __sensitive: unique symbol };

// =============================================================================
// Base Entity Types
// =============================================================================

/**
 * Base interface for all entities in the system.
 *
 * OAK equivalent: OAK.Model.BaseModels.ModelBase
 * OAK used int IDs — we use UUID strings for schema isolation compatibility.
 */
export interface BaseEntity {
  /** UUID v4 primary key */
  id: string;
  createdAt: Date;
  updatedAt: Date;
  /** Keycloak user ID of the creator */
  createdBy: string;
}

/**
 * Extended base for entities that need GDPR audit trail.
 * Phase 2: enforce access logging via middleware.
 * Phase 1: type exists, fields are optional.
 */
export interface AuditableEntity extends BaseEntity {
  lastAccessedAt?: Date;
  lastAccessedBy?: string;
}

// =============================================================================
// Shared Reference Types (shared schema)
// =============================================================================

/**
 * Denormalized user reference — lives in shared.user_references.
 * Auth module is the sole writer (via events). All other modules read-only.
 *
 * OAK equivalent: OAK.Model.Core.Account (but stripped to essentials)
 */
export interface UserReference {
  /** Keycloak user ID (UUID) */
  userId: string;
  /** @pii */ email: PII<string>;
  /** @pii */ displayName: PII<string>;
  /** 'customer' | 'provider' | 'admin' */
  role: UserRole;
}

export type UserRole = 'customer' | 'provider' | 'admin';

// =============================================================================
// Localization Types
// =============================================================================

/**
 * Supported languages for the CDS platform.
 * MVP: DE + EN. DACH expansion: +FR. Full: all 6 from Estate.xlsx seed data.
 *
 * OAK used numeric language IDs (1=EN, 2=DE, 3=FR, 4=TR, 5=ES, 6=RU).
 * We use ISO 639-1 codes.
 */
export type SupportedLocale = 'de' | 'en' | 'fr' | 'tr' | 'es' | 'ru';
export type MVPLocale = 'de' | 'en';

/**
 * Localized text — stores translations for an entity name/description.
 * Used in seed data entities (EstateType, FurnitureType, etc.).
 *
 * OAK equivalent: OAK.Model.BaseModels.LocalizationModelBase + LanguageIdText
 */
export interface LocalizedText {
  /** ISO 639-1 locale code → translated text */
  [locale: string]: string;
}

/**
 * Base for entities that have localized name/description.
 * Seed data from Estate.xlsx follows this pattern.
 */
export interface LocalizableEntity extends BaseEntity {
  /** Localized display name (e.g., { de: "Wohnung", en: "Apartment" }) */
  name: LocalizedText;
  /** Localized description */
  description: LocalizedText;
  isActive: boolean;
}

// =============================================================================
// Status Enums
// =============================================================================

/**
 * Demand lifecycle status.
 * DE: Anfragestatus
 *
 * OAK equivalent: OAK.Model.BusinessModels.DemandModels.DemandStatusType
 * OAK used numeric IDs (hardcoded 2 in DemandGWController) — we use string enums.
 */
export enum DemandStatus {
  /** Talep oluşturuldu, henüz yayınlanmadı / Entwurf */
  DRAFT = 'DRAFT',
  /** Talep aktif, provider'lar teklif verebilir / Veröffentlicht */
  PUBLISHED = 'PUBLISHED',
  /** Teklif kabul edildi, kontrat aşamasında / Angenommen */
  ACCEPTED = 'ACCEPTED',
  /** İş devam ediyor / In Bearbeitung */
  IN_PROGRESS = 'IN_PROGRESS',
  /** İş tamamlandı, ödeme bekleniyor / Abgeschlossen */
  COMPLETED = 'COMPLETED',
  /** İptal edildi / Storniert */
  CANCELLED = 'CANCELLED',
}

/**
 * Offer status within a demand.
 * DE: Angebotsstatus
 *
 * OAK equivalent: CompanyDemandService had no explicit status — derived from DemandStatusType.
 * CDS addition: explicit offer lifecycle.
 */
export enum OfferStatus {
  /** Teklif verildi, müşteri değerlendiriyor / Eingereicht */
  SUBMITTED = 'SUBMITTED',
  /** Müşteri tarafından kabul edildi / Angenommen */
  ACCEPTED = 'ACCEPTED',
  /** Müşteri tarafından reddedildi / Abgelehnt */
  REJECTED = 'REJECTED',
  /** Süre doldu / Abgelaufen */
  EXPIRED = 'EXPIRED',
  /** Provider tarafından geri çekildi / Zurückgezogen */
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Transportation status.
 * DE: Transportstatus
 *
 * OAK equivalent: OAK.Model.BusinessModels.TransportationModels.TransportationStatusType
 */
export enum TransportStatus {
  /** Planlama aşamasında / Geplant */
  PLANNED = 'PLANNED',
  /** Provider yolda / Unterwegs */
  IN_TRANSIT = 'IN_TRANSIT',
  /** Yükleme tamamlandı / Beladen */
  LOADED = 'LOADED',
  /** Teslimat tamamlandı / Geliefert */
  DELIVERED = 'DELIVERED',
  /** Sorun var / Problem */
  ISSUE = 'ISSUE',
}

/**
 * Provider account status.
 * DE: Anbieterstatus
 *
 * OAK equivalent: OAK.Model.BusinessModels.CompanyModels.CompanyStatusType
 * CDS addition: PENDING_DEPOSIT state for deposit/stake mechanism.
 */
export enum ProviderStatus {
  /** Kayıt yapıldı, profil eksik / Registriert */
  REGISTERED = 'REGISTERED',
  /** Profil tamamlandı, depozit bekleniyor / Depozit ausstehend */
  PENDING_DEPOSIT = 'PENDING_DEPOSIT',
  /** Aktif, teklif verebilir / Aktiv */
  ACTIVE = 'ACTIVE',
  /** Geçici askıya alınmış / Gesperrt */
  SUSPENDED = 'SUSPENDED',
  /** Deaktif / Deaktiviert */
  DEACTIVATED = 'DEACTIVATED',
}

/**
 * Contract status.
 * DE: Vertragsstatus
 *
 * CDS addition — OAK had no contract entity.
 */
export enum ContractStatus {
  /** Kontrat oluşturuldu, onay bekliyor / Entwurf */
  DRAFT = 'DRAFT',
  /** Müşteri onayladı / Vom Kunden bestätigt */
  CUSTOMER_ACCEPTED = 'CUSTOMER_ACCEPTED',
  /** Provider onayladı / Vom Anbieter bestätigt */
  PROVIDER_ACCEPTED = 'PROVIDER_ACCEPTED',
  /** Her iki taraf onayladı, aktif / Aktiv */
  ACTIVE = 'ACTIVE',
  /** İş tamamlandı / Erfüllt */
  FULFILLED = 'FULFILLED',
  /** İptal edildi / Storniert */
  CANCELLED = 'CANCELLED',
  /** Anlaşmazlık var / Streitig */
  DISPUTED = 'DISPUTED',
}

/**
 * Payment transaction status.
 * DE: Zahlungsstatus
 *
 * CDS addition — OAK had commission fields but no payment entity.
 */
export enum PaymentStatus {
  /** Ödeme bekleniyor / Ausstehend */
  PENDING = 'PENDING',
  /** Ödeme işleniyor (Stripe'da) / In Bearbeitung */
  PROCESSING = 'PROCESSING',
  /** Ödeme alındı / Bezahlt */
  COMPLETED = 'COMPLETED',
  /** Ödeme başarısız / Fehlgeschlagen */
  FAILED = 'FAILED',
  /** İade edildi / Erstattet */
  REFUNDED = 'REFUNDED',
}

// =============================================================================
// Currency & Money
// =============================================================================

/**
 * Money type — always store as integer cents to avoid floating-point issues.
 * MVP: EUR only.
 */
export interface Money {
  /** Amount in smallest currency unit (cents for EUR) */
  amount: number;
  /** ISO 4217 currency code */
  currency: 'EUR';
}

// =============================================================================
// Elevator Types (Fahrstuhltypen)
// =============================================================================

/**
 * Elevator availability at estate.
 * DE: Fahrstuhlverfügbarkeit
 *
 * OAK equivalent: Estate.ElevatorAvailability (0, 1, 2 integers)
 * Critical for German moving price calculation.
 */
export enum ElevatorType {
  /** Kein Aufzug */
  NONE = 'NONE',
  /** Personenaufzug */
  PERSONAL = 'PERSONAL',
  /** Lastenaufzug (freight — can carry furniture) */
  FREIGHT = 'FREIGHT',
}
