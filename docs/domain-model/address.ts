/**
 * CDS Platform — Address Types
 * DE: Adresse / Anschrift
 *
 * German address format: Straße + Hausnummer, PLZ + Ort
 * OAK source: OAK.Model.BusinessModels.AddressModels.GenericAddress
 *             OAK.Model.Core.PostCodeData
 *
 * @module address
 */

import { AuditableEntity, PII } from './core-types';

// =============================================================================
// Address (Anschrift)
// =============================================================================

/**
 * Generic address — follows German address format.
 * DE: Anschrift
 *
 * OAK equivalent: GenericAddress
 * OAK had: Street, HouseNumber, PostCode, PlaceName, CountryId, GenericAddressTypeId
 *
 * Changes from OAK:
 * - Added `additionalInfo` for c/o, Hinterhaus, etc.
 * - CountryId → countryCode (ISO 3166-1 alpha-2)
 * - GenericAddressType removed — type context comes from usage (from/to/provider)
 * - PII fields marked
 */
export interface Address extends AuditableEntity {
  /** Straße — @pii */
  street: PII<string>;
  /** Hausnummer — @pii */
  houseNumber: PII<string>;
  /** Postleitzahl — NOT PII (public geographic data) */
  postCode: string;
  /** Ort (city/place name) */
  placeName: string;
  /** Additional info: c/o, Hinterhaus, Aufgang, etc. — @pii */
  additionalInfo?: PII<string>;
  /** ISO 3166-1 alpha-2 country code (e.g., 'DE') */
  countryCode: string;
  /** Floor number — relevant for moving price calculation (Stockwerk) */
  floor?: number;
}

// =============================================================================
// PostCodeData (Postleitzahl-Daten)
// =============================================================================

/**
 * German postal code reference data with geo coordinates.
 * DE: Postleitzahl-Datenbank
 *
 * Lives in: shared.post_codes
 * Seed source: MainDocuments/PostCodeData.csv (GeoNames format)
 *
 * OAK equivalent: OAK.Model.Core.PostCodeData
 * OAK had: IsoCountryCode, PostCode, PlaceName, AdminName1/2/3, Latitude, Longitude, Accuracy
 * All fields preserved — this is reference data, not PII.
 */
export interface PostCodeData {
  id: string;
  /** ISO 3166-1 alpha-2 (e.g., 'DE', 'AT', 'CH') */
  countryCode: string;
  /** PLZ (e.g., '40213' for Düsseldorf) */
  postCode: string;
  /** Place name (e.g., 'Düsseldorf') */
  placeName: string;
  /** Bundesland / state (e.g., 'Nordrhein-Westfalen') */
  stateName: string;
  /** State code (e.g., 'NW') */
  stateCode: string;
  /** Kreis / county */
  countyName?: string;
  countyCode?: string;
  /** Gemeinde / community */
  communityName?: string;
  communityCode?: string;
  /** WGS84 coordinates for distance calculation */
  latitude: number;
  longitude: number;
  /** Accuracy: 1=estimated → 6=centroid of addresses */
  accuracy: number;
}

// =============================================================================
// Country (Land)
// =============================================================================

/**
 * Country reference data.
 * DE: Land
 *
 * Lives in: shared.countries
 * Seed source: MainDocuments/Country.csv
 *
 * OAK equivalent: OAK.Model.Core.Country
 * Note: Germany = ID 77 in OAK. We use countryCode as natural key.
 */
export interface Country {
  id: string;
  /** ISO 3166-1 alpha-2 (e.g., 'DE') */
  countryCode: string;
  /** ISO 3166-1 alpha-3 (e.g., 'DEU') */
  countryCode3: string;
  /** Country name in English */
  name: string;
  /** BCP 47 locale tag (e.g., 'de-DE') */
  defaultLocale: string;
  /** International dialing code (e.g., 49 for Germany) */
  phoneCode: number;
}
