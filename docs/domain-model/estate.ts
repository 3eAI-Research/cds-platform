/**
 * CDS Platform — Estate Types (Immobilie / Wohnung)
 *
 * Domain model for the property being moved from/to.
 * This is one of the richest domain areas — 227 furniture types with volumes,
 * 17 room types, 4 estate types, all in 6 languages.
 *
 * Lives in: transport schema
 * Seed source: Umzug/backend/OAK/Documents/Estate.xlsx
 * OAK source: OAK.Model.BusinessModels.EstateModels.*
 *
 * @module estate
 */

import {
  BaseEntity,
  LocalizableEntity,
  LocalizedText,
  ElevatorType,
} from './core-types';

// =============================================================================
// Estate Type (Immobilientyp)
// =============================================================================

/**
 * Type of property being moved.
 * DE: Immobilientyp
 *
 * Seed data (from Estate.xlsx Sheet 1):
 * | ID | EN        | DE                | FR          |
 * |----|-----------|-------------------|-------------|
 * | 1  | Apartment | Wohnung           | Appartement |
 * | 2  | House     | Haus              | Maison      |
 * | 3  | Office    | Geverbeobjekt/Büro| Bureau      |
 * | 4  | Warehouse | Lager             | Entrepôt    |
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.EstateType
 */
export interface EstateType extends LocalizableEntity {
  // name and description are localized (from LocalizableEntity)
  // isActive controls visibility in UI
}

// =============================================================================
// Estate Part Type (Raumtyp)
// =============================================================================

/**
 * Type of room within an estate.
 * DE: Raumtyp / Zimmerart
 *
 * Seed data (from Estate.xlsx Sheet 2 — 17 types):
 * Wohnzimmer, Schlafzimmer, Küche, Esszimmer, Kinderzimmer,
 * Arbeitszimmer, Gästezimmer, Bad, Diele/Flur/Gang,
 * Balkon/Terrasse, Speicher/Abstellkammer, Keller (outer),
 * Garten/Garage (outer), Ankleide, Lager, Büro, Dachboden (outer)
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.EstatePartType
 */
export interface EstatePartType extends LocalizableEntity {
  /**
   * Whether this room type is an "outer part" of the estate.
   * DE: Außenbereich
   *
   * true = Keller, Garten/Garage, Dachboden — shown separately in UI.
   * OAK equivalent: EstatePartType.IsOuterPart
   */
  isOuterPart: boolean;
}

/**
 * Matrix mapping which room types are valid for which estate types.
 * DE: Immobilientyp-Raumtyp-Zuordnung
 *
 * Seed data from Estate.xlsx Sheet 4 (EstateTypeEPartType):
 * - Apartment: all rooms except Warehouse and Office
 * - House: all rooms except Warehouse and Office
 * - Office: only Office room type
 * - Warehouse: only Warehouse room type
 *
 * Used in UI: selecting "Wohnung" shows only applicable room types.
 */
export interface EstateTypePartTypeMap {
  estateTypeId: string;
  estatePartTypeId: string;
  /** Whether this is the "main" room type for the estate type */
  isMainType: boolean;
}

// =============================================================================
// Furniture Group Type (Möbelgruppe)
// =============================================================================

/**
 * Furniture category group.
 * DE: Möbelgruppe
 *
 * Groups from Estate.xlsx FurnitureType.FurnitureGroupId:
 * 1=Teppich(Carpet), 2=Schrank(Cabinet), 3=Regal(Shelf),
 * 4=Rollcontainer, 5=Schreibtisch(Desk), etc.
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.FurnitureGroupType
 */
export interface FurnitureGroupType extends LocalizableEntity {}

// =============================================================================
// Furniture Type (Möbeltyp / Umzugsgut)
// =============================================================================

/**
 * Type of furniture/item to be moved.
 * DE: Möbeltyp / Umzugsgut
 *
 * This is the richest seed data entity: 227 items in 6 languages,
 * each with volume (m³), assembly/disassembly info, and flat rate.
 *
 * Seed data from Estate.xlsx Sheet 3. Examples:
 * | DE                              | Volume | Assemblable | DisassemblePrice | AssemblePrice |
 * |---------------------------------|--------|-------------|-----------------|---------------|
 * | Schreibtisch, bis 1,6 m         | 1.00   | yes         | 10€             | 20€           |
 * | Bücherregal, zerlegbar          | 0.40   | yes         | 10€             | 20€           |
 * | Aktenschrank nicht zerlegbar    | 0.80   | no          | —               | —             |
 * | Teppich – Bis 1m²              | 0.05   | no          | —               | —             |
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.FurnitureType
 */
export interface FurnitureType extends LocalizableEntity {
  /** Which furniture group this belongs to (Möbelgruppe) */
  furnitureGroupTypeId: string;

  /**
   * Volume in cubic meters (m³).
   * DE: Volumen / Ladevolumen
   *
   * Critical for German moving industry: providers price by total volume (Ladevolumen).
   * System auto-calculates total m³ from selected furniture.
   */
  volume: number;

  /**
   * Can this furniture be assembled/disassembled?
   * DE: Zerlegbar
   *
   * If true: disassembleCost and assembleCost apply.
   * Example: "Bücherregal, zerlegbar" vs "Bücherregal nicht zerlegbar"
   */
  assemblable: boolean;

  /** Disassembly cost in EUR cents. DE: Demontagekosten */
  disassembleCost?: number;
  /** Assembly cost in EUR cents. DE: Montagekosten */
  assembleCost?: number;
  /** Flat rate in EUR cents (alternative to assembly/disassembly). DE: Pauschalpreis */
  flatRate?: number;

  /**
   * How this item is counted/calculated.
   * DE: Berechnungstyp
   *
   * OAK equivalent: FurnitureCalculationTypeId
   * 1 = count (Anzahl) — "3 Teppiche"
   * 2 = linear meter (Laufmeter) — "2.5m Bücherregal"
   */
  calculationType: FurnitureCalculationType;
}

export enum FurnitureCalculationType {
  /** Count — user enters number of items. DE: Anzahl */
  COUNT = 'COUNT',
  /** Linear meter — user enters total width in meters. DE: Laufmeter */
  LINEAR_METER = 'LINEAR_METER',
}

// =============================================================================
// Estate Instance (Konkrete Immobilie)
// =============================================================================

/**
 * A specific estate being moved from or to.
 * DE: Konkrete Immobilie / Umzugsobjekt
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.Estate
 *
 * Changes from OAK:
 * - int IDs → UUID strings
 * - ElevatorAvailability int → ElevatorType enum
 * - Embedded Flats → separate EstatePart records
 * - Added walkingWayMeters (was in TransCalReq, belongs here logically)
 */
export interface Estate extends BaseEntity {
  /** Which type: Wohnung, Haus, Büro, Lager */
  estateTypeId: string;

  /** Living area in m². DE: Wohnfläche */
  totalSquareMeters: number;
  /** Number of floors: 1=Single, 2=Duplex, 3=Triplex. DE: Etagen */
  numberOfFloors: number;
  /** Number of rooms. DE: Zimmeranzahl */
  numberOfRooms: number;

  /**
   * Elevator type at this location.
   * DE: Fahrstuhlverfügbarkeit
   * Critical for price calculation — no elevator = higher cost on upper floors.
   */
  elevatorType: ElevatorType;

  /**
   * Walking distance from parking to entrance in meters.
   * DE: Trageweg
   *
   * Germany-specific pricing factor: how far movers must carry items
   * from the truck to the building entrance.
   * OAK equivalent: TransCalReq.fromWalkingWay / toWalkingWay
   */
  walkingWayMeters: number;

  // --- German-specific property features (Alman konut standardı) ---

  /** Does the Halteverbot (no-parking zone) need to be arranged? DE: Halteverbot erforderlich */
  halteverbotRequired: boolean;
  /** DE: Möbelmontage — furniture assembly/disassembly service requested */
  furnitureMontage: boolean;
  /** DE: Küchenmontage — kitchen assembly/disassembly service requested */
  kitchenMontage: boolean;
  /** DE: Verpackungsservice — packing service requested */
  packingService: boolean;

  // --- Outer parts (Außenbereiche) ---
  /** Has a Keller (cellar/basement) — very common in German properties */
  hasCellar: boolean;
  cellarSquareMeters?: number;
  /** Has a Dachboden (loft/attic) */
  hasLoft: boolean;
  loftSquareMeters?: number;
  /** Has a Garten/Garage */
  hasGardenGarage: boolean;
  gardenGarageSquareMeters?: number;

  /** Reference to the address of this estate */
  addressId: string;
}

// =============================================================================
// Estate Part (Raum / Zimmer)
// =============================================================================

/**
 * A specific room within an estate, with its furniture.
 * DE: Raum / Zimmer
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.EstatePart + EstatesFlat
 * OAK had: Estate → Flats → EstateParts → Furnitures (3-level nesting)
 * We flatten to: Estate → EstateParts (each part has room type + furniture list)
 */
export interface EstatePart extends BaseEntity {
  estateId: string;
  estatePartTypeId: string;
  /** Custom name for this room (e.g., "Schlafzimmer 2") */
  customName?: string;
  /** Furniture items in this room */
  furniture: FurnitureItem[];
}

/**
 * A specific furniture item in a room.
 * DE: Möbelstück / Umzugsgut-Position
 *
 * OAK equivalent: OAK.Model.BusinessModels.EstateModels.Furniture
 */
export interface FurnitureItem {
  furnitureTypeId: string;
  /**
   * Quantity or measurement depending on FurnitureCalculationType:
   * - COUNT: number of items (e.g., 3 chairs)
   * - LINEAR_METER: total width in meters (e.g., 2.5m bookshelf)
   *
   * OAK equivalent: Furniture.NumberOfFurnitures
   */
  quantity: number;
  /** Calculated volume = furnitureType.volume × quantity. DE: Gesamtvolumen */
  calculatedVolume?: number;
}
