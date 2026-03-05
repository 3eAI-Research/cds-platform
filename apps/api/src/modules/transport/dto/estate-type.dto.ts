/**
 * Estate Type DTOs — Immobilientyp (Apartment, House, Office, Warehouse)
 */

/** Response: single estate type with localized name */
export class EstateTypeResponse {
  id!: string;
  name!: string; // Localized from JSON based on Accept-Language
  description!: string;
  isActive!: boolean;
}

/** Response: estate type with its valid room types */
export class EstateTypeWithPartsResponse extends EstateTypeResponse {
  partTypes!: EstatePartTypeResponse[];
}

/** Response: estate part type / room type */
export class EstatePartTypeResponse {
  id!: string;
  name!: string;
  description!: string;
  isActive!: boolean;
  isOuterPart!: boolean;
}
