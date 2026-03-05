/**
 * CDS Platform — Demand Types (Umzugsanfrage)
 *
 * A demand represents a customer's request for a moving service.
 * The demand module owns the demand lifecycle but orchestrates estate/transport
 * creation across modules.
 *
 * Lives in: demand schema
 * OAK source: OAK.Model.BusinessModels.DemandModels.*
 *
 * Architecture note (from Mimar):
 * Demand module orchestrates the creation flow but does NOT own estate/transport data.
 * - demand schema: demands, demand_items
 * - transport schema: transportation, estates, furniture (owned by transport module)
 * - Demand API accepts the full payload, then dispatches to relevant modules.
 *
 * @module demand
 */

import { AuditableEntity, DemandStatus, Money, PII } from './core-types';

// =============================================================================
// Demand (Umzugsanfrage)
// =============================================================================

/**
 * A customer's moving service request.
 * DE: Umzugsanfrage
 *
 * OAK equivalent: OAK.Model.BusinessModels.DemandModels.Demand
 *
 * Changes from OAK:
 * - Removed: Transportations collection (transport module owns this)
 * - Removed: DemandEstimatedValue, DemandMaxOfferedValue, etc. (moved to offer module as aggregated stats)
 * - Removed: AcceptedOfferId (offer module manages this)
 * - Added: explicit status enum (was hardcoded int in OAK)
 * - Added: serviceTypes for multi-service demands
 * - Commission fields moved to payment module
 */
export interface Demand extends AuditableEntity {
  /** Keycloak user ID of the customer. DE: Kunde */
  customerUserId: string;

  /** Current lifecycle status. DE: Anfragestatus */
  status: DemandStatus;

  /**
   * What type of moving service.
   * DE: Umzugsart / Serviceart
   *
   * OAK equivalent: Demand.DemandTypeId → DemandType
   * OAK had: localized DemandType entity. We simplify for MVP.
   */
  serviceType: DemandServiceType;

  /**
   * Reference to the transportation detail (owned by transport module).
   * This is a cross-module reference — UUID only, no FK.
   */
  transportationId: string;

  /**
   * Reference to the accepted offer (owned by offer module).
   * Set when customer accepts an offer.
   */
  acceptedOfferId?: string;

  /** Free-text additional notes from customer. DE: Zusätzliche Informationen */
  additionalNotes?: string;

  /** Preferred language for communication. DE: Bevorzugte Sprache */
  preferredLocale: string;

  /** When the demand expires (providers can no longer submit offers) */
  expiresAt?: Date;

  // --- Denormalized stats (updated by offer module via events) ---

  /** Number of offers received. DE: Anzahl der Angebote */
  offerCount: number;
}

/**
 * Type of moving service requested.
 * DE: Umzugsart
 *
 * OAK equivalent: DemandType (was a localized lookup table)
 * MVP: only RESIDENTIAL and COMMERCIAL.
 */
export enum DemandServiceType {
  /** Privatumzug — home/apartment move */
  RESIDENTIAL = 'RESIDENTIAL',
  /** Firmenumzug / Büroumzug — office/commercial move */
  COMMERCIAL = 'COMMERCIAL',
  /** Fernumzug — long-distance / intercity */
  LONG_DISTANCE = 'LONG_DISTANCE',
  /** Internationaler Umzug — cross-border */
  INTERNATIONAL = 'INTERNATIONAL',
}

// =============================================================================
// Demand Creation DTO (API Request)
// =============================================================================

/**
 * Full payload for creating a demand.
 * DE: Umzugsanfrage erstellen
 *
 * This is the orchestration payload — demand module receives it,
 * then dispatches estate/transport data to their owning modules.
 *
 * OAK equivalent: CreateTransportationDemandReqMdl
 * OAK had: { Demand, Transportation } as a combined request.
 * We extend this with explicit from/to estate data.
 */
export interface CreateDemandRequest {
  /** Demand details */
  serviceType: DemandServiceType;
  additionalNotes?: string;
  preferredLocale: string;

  /** Transportation details (dispatched to transport module) */
  transportation: CreateTransportationRequest;
}

/**
 * Transportation data within a demand creation request.
 * Dispatched to the transport module for persistence.
 */
export interface CreateTransportationRequest {
  /** From address. DE: Beladeadresse */
  fromAddress: CreateAddressRequest;
  /** To address. DE: Entladeadresse */
  toAddress: CreateAddressRequest;
  /** From estate details. DE: Auszugsimmobilie */
  fromEstate: CreateEstateRequest;
  /** To estate details. DE: Einzugsimmobilie */
  toEstate: CreateEstateRequest;
  /** Number of people in household. DE: Personenanzahl */
  numberOfPeople: number;
  /** Preferred moving date range */
  preferredDateStart: Date;
  preferredDateEnd: Date;
  /** Flexible on dates? DE: Flexibler Zeitraum */
  dateFlexibility: boolean;
}

/**
 * Address within a creation request.
 */
export interface CreateAddressRequest {
  street: string;
  houseNumber: string;
  postCode: string;
  placeName: string;
  additionalInfo?: string;
  countryCode: string;
  floor?: number;
}

/**
 * Estate within a creation request.
 */
export interface CreateEstateRequest {
  estateTypeId: string;
  totalSquareMeters: number;
  numberOfFloors: number;
  numberOfRooms: number;
  elevatorType: string;
  walkingWayMeters: number;
  halteverbotRequired: boolean;
  furnitureMontage: boolean;
  kitchenMontage: boolean;
  packingService: boolean;
  hasCellar: boolean;
  cellarSquareMeters?: number;
  hasLoft: boolean;
  loftSquareMeters?: number;
  hasGardenGarage: boolean;
  gardenGarageSquareMeters?: number;
  /** Room-by-room furniture selection */
  parts: CreateEstatePartRequest[];
}

export interface CreateEstatePartRequest {
  estatePartTypeId: string;
  customName?: string;
  furniture: { furnitureTypeId: string; quantity: number }[];
}
