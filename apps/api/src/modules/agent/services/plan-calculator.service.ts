import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  TravelMode,
  DirectionsResponse,
} from '@googlemaps/google-maps-services-js';
import { PrismaService } from '../../../prisma/prisma.service';

// ─── Input / Output Interfaces ───────────────────────────────────────────────

export interface PlanAddress {
  postCode: string;
  placeName: string;
  street?: string;
  floor?: number;
  elevatorType?: string; // 'NONE' | 'PERSONAL' | 'FREIGHT'
}

export interface PlanInput {
  fromAddress: PlanAddress;
  toAddress: PlanAddress;
  furnitureItems: Array<{ furnitureTypeId: string; quantity: number }>;
  preferredDate?: string; // ISO date
  services: {
    furnitureMontage?: boolean;
    kitchenMontage?: boolean;
    packingService?: boolean;
  };
}

export interface TimelineSegment {
  type:
    | 'LOADING'
    | 'DRIVING'
    | 'BREAK'
    | 'UNLOADING'
    | 'ASSEMBLY'
    | 'DISASSEMBLY'
    | 'PACKING'
    | 'KITCHEN'
    | 'OVERNIGHT';
  durationHours: number;
  manHours?: number;
}

export interface MovingPlan {
  route: {
    distanceKm: number;
    durationHours: number;
    source: 'google_maps' | 'haversine_fallback';
  };
  vehicle: {
    type: string;
    count: number;
    maxLoadM3: number;
  };
  crew: {
    workers: number;
    drivers: number;
  };
  timeline: {
    segments: TimelineSegment[];
    totalDurationHours: number;
    totalManHours: number;
    multiDay: boolean;
  };
  volume: {
    totalM3: number;
    itemCount: number;
  };
  toleranceBand: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const AVG_SPEED_KMH = 80;

/** EU EC 561/2006 driving regulations */
const MAX_CONTINUOUS_DRIVING_HOURS = 4.5;
const MANDATORY_BREAK_HOURS = 0.75; // 45 minutes
const MAX_DAILY_DRIVING_HOURS = 9;
const OVERNIGHT_REST_HOURS = 11;

/** Loading/unloading rates */
const LOADING_MIN_PER_M3 = 12;
const UNLOADING_MIN_PER_M3 = 10;
const PACKING_MIN_PER_M3 = 8;
const KITCHEN_FLAT_HOURS = 4;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PlanCalculatorService {
  private readonly logger = new Logger(PlanCalculatorService.name);
  private readonly mapsClient: Client;
  private readonly googleMapsApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.mapsClient = new Client({});
    this.googleMapsApiKey = this.configService.get<string>(
      'GOOGLE_MAPS_API_KEY',
      '',
    );
  }

  // ─── Main Entry Point ───────────────────────────────────────────────────────

  /**
   * Calculate a complete moving plan from the given input.
   * Orchestrates volume, route, vehicle, crew, and timeline calculations.
   */
  async calculatePlan(input: PlanInput): Promise<MovingPlan> {
    this.logger.log(
      `Calculating plan: ${input.fromAddress.postCode} → ${input.toAddress.postCode}`,
    );

    // 1. Volume — resolve from furniture items via database
    const volume = await this.calculateVolume(input.furnitureItems);
    this.logger.log(
      `Volume: ${volume.totalM3} m³ (${volume.itemCount} items)`,
    );

    // 2. Route — Google Maps with Haversine fallback (BR-CALC-001)
    const route = await this.calculateRoute(
      input.fromAddress,
      input.toAddress,
    );
    this.logger.log(
      `Route: ${route.distanceKm} km, ${route.durationHours} h (${route.source})`,
    );

    // 3. Vehicle selection (BR-CALC-003)
    const vehicle = this.selectVehicle(volume.totalM3);
    this.logger.log(`Vehicle: ${vehicle.count}x ${vehicle.type}`);

    // 4. Crew sizing (BR-CALC-002)
    const crew = this.calculateCrew(
      volume.totalM3,
      input.fromAddress,
      input.toAddress,
      vehicle.count,
    );
    this.logger.log(`Crew: ${crew.workers} workers, ${crew.drivers} drivers`);

    // 5. Timeline with EU regulations (BR-CALC-004, BR-CALC-005)
    const timeline = this.buildTimeline(
      volume.totalM3,
      route.durationHours,
      crew.workers,
      crew.drivers,
      input.services,
    );
    this.logger.log(
      `Timeline: ${timeline.totalDurationHours} h total, ${timeline.totalManHours} man-hours, multiDay=${timeline.multiDay}`,
    );

    // 6. Tolerance band
    const toleranceBand = this.calculateToleranceBand(route.source);

    return {
      route,
      vehicle,
      crew,
      timeline,
      volume,
      toleranceBand,
    };
  }

  // ─── Volume Calculation ─────────────────────────────────────────────────────

  /**
   * Calculate total volume by looking up FurnitureType records in the database.
   * Mirrors VolumeCalculatorService logic but without locale resolution.
   */
  private async calculateVolume(
    items: Array<{ furnitureTypeId: string; quantity: number }>,
  ): Promise<{ totalM3: number; itemCount: number }> {
    if (!items.length) {
      return { totalM3: 0, itemCount: 0 };
    }

    const typeIds = items.map((i) => i.furnitureTypeId);
    const furnitureTypes = await this.prisma.furnitureType.findMany({
      where: { id: { in: typeIds } },
    });

    const typeMap = new Map(furnitureTypes.map((ft) => [ft.id, ft]));

    let totalM3 = 0;
    let itemCount = 0;

    for (const item of items) {
      const ft = typeMap.get(item.furnitureTypeId);
      if (!ft) {
        this.logger.warn(
          `Unknown furnitureTypeId: ${item.furnitureTypeId}, skipping`,
        );
        continue;
      }
      totalM3 += ft.volume * item.quantity;
      itemCount += item.quantity;
    }

    return {
      totalM3: Math.round(totalM3 * 100) / 100,
      itemCount,
    };
  }

  // ─── Route Calculation (BR-CALC-001) ────────────────────────────────────────

  /**
   * Calculate route distance and duration.
   * Tries Google Maps Directions API first; falls back to Haversine on failure.
   */
  private async calculateRoute(
    from: PlanAddress,
    to: PlanAddress,
  ): Promise<MovingPlan['route']> {
    // Attempt Google Maps first
    if (this.googleMapsApiKey) {
      try {
        return await this.routeViaGoogleMaps(from, to);
      } catch (error) {
        this.logger.warn(
          `Google Maps API failed, falling back to Haversine: ${(error as Error).message}`,
        );
      }
    } else {
      this.logger.warn(
        'GOOGLE_MAPS_API_KEY not configured, using Haversine fallback',
      );
    }

    // Haversine fallback
    return this.routeViaHaversine(from.postCode, to.postCode);
  }

  /**
   * Route calculation via Google Maps Directions API.
   */
  private async routeViaGoogleMaps(
    from: PlanAddress,
    to: PlanAddress,
  ): Promise<MovingPlan['route']> {
    const originStr = this.buildAddressString(from);
    const destStr = this.buildAddressString(to);

    const response: DirectionsResponse =
      await this.mapsClient.directions({
        params: {
          origin: originStr,
          destination: destStr,
          mode: TravelMode.driving,
          key: this.googleMapsApiKey,
        },
      });

    const route = response.data.routes?.[0];
    if (!route?.legs?.length) {
      throw new Error('No route found in Google Maps response');
    }

    const leg = route.legs[0];
    if (!leg) {
      throw new Error('No leg found in Google Maps route');
    }
    const distanceKm = Math.round((leg.distance.value / 1000) * 10) / 10;
    const durationHours = Math.round((leg.duration.value / 3600) * 100) / 100;

    return {
      distanceKm,
      durationHours,
      source: 'google_maps',
    };
  }

  /**
   * Build a geocoding-friendly address string.
   */
  private buildAddressString(addr: PlanAddress): string {
    const parts: string[] = [];
    if (addr.street) parts.push(addr.street);
    parts.push(`${addr.postCode} ${addr.placeName}`);
    parts.push('Germany');
    return parts.join(', ');
  }

  /**
   * Haversine fallback: lookup PLZ lat/lng from the database and compute
   * great-circle distance. Driving duration estimated at 80 km/h average.
   */
  private async routeViaHaversine(
    fromPostCode: string,
    toPostCode: string,
  ): Promise<MovingPlan['route']> {
    const [fromPC, toPC] = await Promise.all([
      this.prisma.postCode.findFirst({
        where: { postCode: fromPostCode, countryCode: 'DE' },
      }),
      this.prisma.postCode.findFirst({
        where: { postCode: toPostCode, countryCode: 'DE' },
      }),
    ]);

    if (!fromPC || !toPC) {
      throw new Error(
        `PostCode not found: ${!fromPC ? fromPostCode : toPostCode}`,
      );
    }

    const distanceKm = this.haversineDistance(
      fromPC.latitude,
      fromPC.longitude,
      toPC.latitude,
      toPC.longitude,
    );

    // Apply road-factor: actual driving distance is ~1.3x straight-line
    const roadDistanceKm = Math.round(distanceKm * 1.3 * 10) / 10;
    const durationHours =
      Math.round((roadDistanceKm / AVG_SPEED_KMH) * 100) / 100;

    return {
      distanceKm: roadDistanceKm,
      durationHours,
      source: 'haversine_fallback',
    };
  }

  /**
   * Haversine formula:
   * d = 2R * asin(sqrt(sin²(dlat/2) + cos(lat1)*cos(lat2)*sin²(dlng/2)))
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
  }

  // ─── Vehicle Selection (BR-CALC-003) ────────────────────────────────────────

  /**
   * Select vehicle type and count based on total volume.
   */
  private selectVehicle(totalM3: number): MovingPlan['vehicle'] {
    if (totalM3 <= 12) {
      return { type: 'Transporter (Sprinter)', count: 1, maxLoadM3: 12 };
    }
    if (totalM3 <= 25) {
      return { type: 'LKW 3.5t', count: 1, maxLoadM3: 25 };
    }
    if (totalM3 <= 45) {
      return { type: 'LKW 7.5t', count: 1, maxLoadM3: 45 };
    }
    if (totalM3 <= 65) {
      return { type: 'LKW 12t', count: 1, maxLoadM3: 65 };
    }

    // >65 m³ → multiple LKW 12t
    const count = Math.ceil(totalM3 / 65);
    return { type: 'LKW 12t', count, maxLoadM3: 65 };
  }

  // ─── Crew Sizing (BR-CALC-002) ─────────────────────────────────────────────

  /**
   * Calculate crew size based on volume, floor access, and vehicle count.
   */
  private calculateCrew(
    totalM3: number,
    from: PlanAddress,
    to: PlanAddress,
    vehicleCount: number,
  ): MovingPlan['crew'] {
    let baseCrew = Math.ceil(totalM3 / 20) + 1;

    // Extra worker if no elevator and high floor at origin
    if (
      from.elevatorType === 'NONE' &&
      from.floor !== undefined &&
      from.floor > 2
    ) {
      baseCrew += 1;
    }

    // Extra worker if no elevator and high floor at destination
    if (
      to.elevatorType === 'NONE' &&
      to.floor !== undefined &&
      to.floor > 2
    ) {
      baseCrew += 1;
    }

    const workers = Math.max(2, Math.min(8, baseCrew));
    const drivers = vehicleCount;

    return { workers, drivers };
  }

  // ─── Timeline & Man-Hours (BR-CALC-004, BR-CALC-005) ───────────────────────

  /**
   * Build a complete timeline with EU driving regulation compliance.
   */
  private buildTimeline(
    totalM3: number,
    drivingHoursRaw: number,
    workers: number,
    drivers: number,
    services: PlanInput['services'],
  ): MovingPlan['timeline'] {
    const segments: TimelineSegment[] = [];

    // ── Pre-drive activities ──────────────────────────────────────────────

    // Packing (if requested)
    if (services.packingService) {
      const packingHours = (totalM3 * PACKING_MIN_PER_M3) / workers / 60;
      segments.push({
        type: 'PACKING',
        durationHours: this.round2(packingHours),
        manHours: this.round2(packingHours * workers),
      });
    }

    // Disassembly (if furniture montage requested)
    if (services.furnitureMontage) {
      // TODO: calculate from furniture assembleCost — placeholder 1h
      const disassemblyHours = 1;
      segments.push({
        type: 'DISASSEMBLY',
        durationHours: disassemblyHours,
        manHours: this.round2(disassemblyHours * workers),
      });
    }

    // Loading
    const loadingHours = (totalM3 * LOADING_MIN_PER_M3) / workers / 60;
    segments.push({
      type: 'LOADING',
      durationHours: this.round2(loadingHours),
      manHours: this.round2(loadingHours * workers),
    });

    // ── Driving with EU break/rest rules ──────────────────────────────────

    this.addDrivingSegments(segments, drivingHoursRaw, drivers);

    // ── Post-drive activities ─────────────────────────────────────────────

    // Unloading
    const unloadingHours = (totalM3 * UNLOADING_MIN_PER_M3) / workers / 60;
    segments.push({
      type: 'UNLOADING',
      durationHours: this.round2(unloadingHours),
      manHours: this.round2(unloadingHours * workers),
    });

    // Assembly (if furniture montage requested)
    if (services.furnitureMontage) {
      // TODO: calculate from furniture assembleCost — placeholder 1h
      const assemblyHours = 1;
      segments.push({
        type: 'ASSEMBLY',
        durationHours: assemblyHours,
        manHours: this.round2(assemblyHours * workers),
      });
    }

    // Kitchen montage (flat 4 hours)
    if (services.kitchenMontage) {
      segments.push({
        type: 'KITCHEN',
        durationHours: KITCHEN_FLAT_HOURS,
        manHours: this.round2(KITCHEN_FLAT_HOURS * workers),
      });
    }

    // ── Totals ────────────────────────────────────────────────────────────

    const totalDurationHours = this.round2(
      segments.reduce((sum, s) => sum + s.durationHours, 0),
    );

    const totalManHours = this.round2(
      segments.reduce((sum, s) => sum + (s.manHours ?? 0), 0),
    );

    const multiDay = segments.some((s) => s.type === 'OVERNIGHT');

    return {
      segments,
      totalDurationHours,
      totalManHours,
      multiDay,
    };
  }

  /**
   * Generate driving segments respecting EU EC 561/2006:
   * - Max 4.5 h continuous driving → mandatory 45 min break
   * - Max 9 h daily driving → overnight rest (11 h)
   */
  private addDrivingSegments(
    segments: TimelineSegment[],
    totalDrivingHours: number,
    drivers: number,
  ): void {
    let remainingHours = totalDrivingHours;
    let dailyDriven = 0;

    while (remainingHours > 0) {
      // How much can we drive in this stretch?
      const maxStretch = Math.min(
        MAX_CONTINUOUS_DRIVING_HOURS,
        MAX_DAILY_DRIVING_HOURS - dailyDriven,
        remainingHours,
      );

      const stretchHours = this.round2(maxStretch);

      segments.push({
        type: 'DRIVING',
        durationHours: stretchHours,
        manHours: this.round2(stretchHours * drivers),
      });

      remainingHours -= stretchHours;
      dailyDriven += stretchHours;

      if (remainingHours <= 0) break;

      // Check if daily limit reached → overnight rest
      if (dailyDriven >= MAX_DAILY_DRIVING_HOURS) {
        segments.push({
          type: 'OVERNIGHT',
          durationHours: OVERNIGHT_REST_HOURS,
        });
        dailyDriven = 0;
      } else {
        // Continuous driving limit reached → mandatory break
        segments.push({
          type: 'BREAK',
          durationHours: MANDATORY_BREAK_HOURS,
        });
      }
    }
  }

  // ─── Tolerance Band ─────────────────────────────────────────────────────────

  /**
   * Return a tolerance description based on route source accuracy.
   */
  private calculateToleranceBand(
    source: 'google_maps' | 'haversine_fallback',
  ): string {
    if (source === 'google_maps') {
      return '±10% (Google Maps routing)';
    }
    return '±20% (Haversine estimate — actual road distance may vary)';
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
