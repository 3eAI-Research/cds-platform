/**
 * CDS Platform — Transportation Types (Umzugstransport)
 *
 * Transportation represents the physical moving operation tied to a demand.
 * Owns estate, address, and furniture data for the move.
 *
 * Lives in: transport schema
 * OAK source: OAK.Model.BusinessModels.TransportationModels.*
 *
 * @module transport
 */

import { BaseEntity, TransportStatus, Money, ElevatorType } from './core-types';

// =============================================================================
// Transportation (Umzugstransport)
// =============================================================================

/**
 * The physical transportation/moving operation.
 * DE: Umzugstransport / Transport
 *
 * OAK equivalent: OAK.Model.BusinessModels.TransportationModels.Transportation
 *
 * Changes from OAK:
 * - Removed: DemandId direct reference (demand module references us, not the other way)
 * - Removed: Min/Max/Average/NumberOfOffers (moved to offer module)
 * - Removed: CommissionAmount, VAT, GrossValue (moved to payment module)
 * - Removed: IsFixedPrice (this is an offer-level concern)
 * - Added: explicit estimatedVolume (auto-calculated from furniture)
 * - Added: estimatedDistance (calculated from PostCodeData coordinates)
 * - Changed: int IDs → UUIDs
 * - Changed: estate/address are owned here (transport schema), not demand
 */
export interface Transportation extends BaseEntity {
  /** What type of transport. DE: Transportart */
  transportTypeId: string;
  /** Current status. DE: Transportstatus */
  status: TransportStatus;

  // --- From / To (Belade-/Entladeort) ---

  /** Origin estate. DE: Auszugsimmobilie */
  fromEstateId: string;
  /** Destination estate. DE: Einzugsimmobilie */
  toEstateId: string;
  /** Origin address. DE: Beladeadresse */
  fromAddressId: string;
  /** Destination address. DE: Entladeadresse */
  toAddressId: string;

  // --- Schedule (Terminplanung) ---

  /** Number of people in household. DE: Personenanzahl */
  numberOfPeople: number;
  /** Earliest acceptable moving date. DE: Frühester Umzugstermin */
  preferredDateStart: Date;
  /** Latest acceptable moving date. DE: Spätester Umzugstermin */
  preferredDateEnd: Date;
  /** Flexible on exact date? DE: Flexibler Zeitraum */
  dateFlexibility: boolean;

  // --- Calculated values (Berechnete Werte) ---

  /**
   * Total estimated volume of goods in m³.
   * DE: Geschätztes Ladevolumen
   *
   * Auto-calculated: sum of all furniture items' calculated volumes.
   * This is the key metric for German moving industry pricing.
   */
  estimatedVolume: number;

  /**
   * Estimated distance between from/to addresses in km.
   * DE: Geschätzte Entfernung
   *
   * Calculated from PostCodeData.latitude/longitude using Haversine formula.
   * OAK equivalent: TransCalReq.dinstanceInKM (note: typo in original)
   */
  estimatedDistanceKm: number;

  /**
   * Additional info from customer.
   * DE: Zusätzliche Hinweise / Was ist sonst noch wichtig
   */
  additionalInfo?: string;
}

// =============================================================================
// Transportation Type (Transportart)
// =============================================================================

/**
 * Type of transportation service.
 * DE: Transportart / Umzugsart
 *
 * OAK equivalent: OAK.Model.BusinessModels.TransportationModels.TransportationType
 */
export enum TransportationType {
  /** Standard home move within same city. DE: Lokalumzug */
  LOCAL = 'LOCAL',
  /** Long-distance move between cities. DE: Fernumzug */
  LONG_DISTANCE = 'LONG_DISTANCE',
  /** International move. DE: Internationaler Umzug */
  INTERNATIONAL = 'INTERNATIONAL',
  /** Office/commercial move. DE: Firmenumzug */
  COMMERCIAL = 'COMMERCIAL',
}

// =============================================================================
// Volume Calculation (Volumenberechnung)
// =============================================================================

/**
 * Request for transportation cost/volume estimation.
 * DE: Umzugskalkulation
 *
 * OAK equivalent: OAK.Model.BusinessModels.TransportationModels.TransportationCalculationModels.TransCalReq
 *
 * Changes from OAK:
 * - Renamed fields for clarity (fromFloor→fromFloor, dinstanceInKM→distanceKm)
 * - Added estimatedVolume
 * - Uses ElevatorType enum instead of int
 */
export interface TransportEstimation {
  /** Living area range. DE: Wohnfläche */
  minSquareMeters: number;
  maxSquareMeters: number;

  /** Origin details */
  fromFloor: number;
  fromElevatorType: ElevatorType;
  /** DE: Trageweg — walking distance from truck to entrance (meters) */
  fromWalkingWayMeters: number;

  /** Destination details */
  toFloor: number;
  toElevatorType: ElevatorType;
  toWalkingWayMeters: number;

  /** Household size. DE: Personenanzahl */
  numberOfPeople: number;

  /** Coordinates for distance calculation */
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;

  /** Calculated distance in km */
  distanceKm: number;

  /** Total estimated volume from furniture selection (m³) */
  estimatedVolume?: number;
}

/**
 * Result of transportation estimation.
 * DE: Kalkulationsergebnis
 *
 * OAK equivalent: TransCalRes
 */
export interface TransportEstimationResult {
  /** Estimated price range. DE: Geschätzte Preisspanne */
  estimatedMinPrice: Money;
  estimatedMaxPrice: Money;
  /** Recommended vehicle type */
  recommendedVehicleType?: string;
  /** Estimated number of vehicles needed */
  estimatedVehicleCount?: number;
}
