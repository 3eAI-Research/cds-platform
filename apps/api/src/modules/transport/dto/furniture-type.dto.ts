/**
 * Furniture Type DTOs — Möbeltyp (227 items grouped by Möbelgruppe)
 */

/** Response: furniture group with its items */
export class FurnitureGroupResponse {
  id!: string;
  name!: string;
  description!: string;
  furnitureTypes!: FurnitureTypeResponse[];
}

/** Response: single furniture type */
export class FurnitureTypeResponse {
  id!: string;
  name!: string;
  description!: string;
  volume!: number; // m³
  assemblable!: boolean;
  disassembleCost?: number; // EUR cents
  assembleCost?: number; // EUR cents
  flatRate?: number; // EUR cents
  calculationType!: string; // COUNT | LINEAR_METER
}
