/**
 * Post Code DTOs — PLZ lookup (German postal codes with geo-coordinates)
 */

/** Response: post code lookup result */
export class PostCodeResponse {
  postCode!: string;
  placeName!: string;
  adminName1?: string; // Bundesland
  adminName2?: string; // Regierungsbezirk
  adminName3?: string; // Kreis
  latitude!: number;
  longitude!: number;
}
