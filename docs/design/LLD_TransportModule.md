# Low-Level Design: Transport Module

**Version:** 1.0.0
**Date:** 2026-03-04
**Author:** Mimar (Architect)
**Status:** DRAFT — Pending Muhendis review
**HLD Reference:** `docs/plans/cds-mvp-hld.md` Section 3.5
**Domain Model:** `docs/domain-model/transport.ts`, `estate.ts`, `address.ts`
**API Contracts:** `docs/domain-model/api-contracts.ts` — TransportApi
**Prisma Schema:** `prisma/transport.prisma`

---

## 1. Business Logic Alignment

### 1.1 Module Purpose

The Transport module owns moving-domain-specific data: estates (properties), rooms, furniture inventory, addresses, and transportation logistics. It is the foundation of the CDS platform — the German moving industry prices everything based on **Ladevolumen** (cargo volume in m³).

### 1.2 Business Flows

```
Flow 1: Seed Data Retrieval (public, no auth)
─────────────────────────────────────────────
Customer opens demand form
  → Frontend fetches estate types (GET /estate-types)
  → Customer selects estate type (e.g., "Wohnung")
  → Frontend fetches valid room types (GET /estate-types/:id/part-types)
  → For each room, frontend fetches furniture catalog (GET /furniture-types)
  → Customer selects furniture items + quantities
  → Frontend calls volume estimate (POST /transport/estimate-volume)
  → Total volume displayed to customer
  → Customer enters from/to PLZ
  → Frontend validates PLZ (GET /post-codes/:code)
  → Distance calculated client-side from lat/lng (or server-side)

Flow 2: Transport Creation (via Demand orchestration, internal)
──────────────────────────────────────────────────────────────
Demand module receives CreateDemandRequest
  → Demand module calls TransportService.createTransportation()
  → TransportService creates: Address (from) → Address (to)
  → TransportService creates: Estate (from) → EstateParts → FurnitureItems
  → TransportService creates: Estate (to) → EstateParts → FurnitureItems
  → TransportService creates: Transportation record
  → TransportService calculates estimatedVolume + estimatedDistanceKm
  → TransportService emits TRANSPORT_CREATED event
  → Returns transportationId to Demand module
```

### 1.3 Traceability Matrix

| Business Requirement | API Endpoint | Service Method | Prisma Model |
|---------------------|-------------|---------------|-------------|
| Customer sees estate types | `GET /estate-types` | `EstateTypeService.findAll()` | EstateType |
| Customer sees rooms for estate | `GET /estate-types/:id/part-types` | `EstateTypeService.findPartTypes()` | EstatePartType, EstateTypePartTypeMap |
| Customer browses furniture | `GET /furniture-types` | `FurnitureTypeService.findAll()` | FurnitureType |
| Customer sees furniture groups | `GET /furniture-groups` | `FurnitureTypeService.findGroups()` | FurnitureGroupType |
| Customer estimates volume | `POST /transport/estimate-volume` | `VolumeCalculatorService.estimate()` | FurnitureType (read) |
| Customer validates PLZ | `GET /post-codes/:code` | `PostCodeService.findByCode()` | PostCode (shared schema) |
| Demand creates transport | (internal service call) | `TransportService.create()` | Transportation, Estate, EstatePart, FurnitureItem, Address |

---

## 2. Database Schema Design

### 2.1 Schema: `transport`

Prisma schema is the source of truth (`prisma/transport.prisma`). Below is the SQL equivalent for reviewer reference.

```sql
-- Schema creation
CREATE SCHEMA IF NOT EXISTS transport;

-- =============================================
-- Seed Data Tables (populated by prisma/seed.ts)
-- =============================================

-- Estate Types: Wohnung, Haus, Büro, Lager (4 rows × 6 languages)
CREATE TABLE transport.estate_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        JSONB NOT NULL,        -- { "de": "Wohnung", "en": "Apartment", ... }
    description JSONB NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Estate Part Types / Room Types: Wohnzimmer, Schlafzimmer, Küche, ... (17 rows × 6 languages)
CREATE TABLE transport.estate_part_types (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         JSONB NOT NULL,
    description  JSONB NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    is_outer_part BOOLEAN NOT NULL DEFAULT false  -- Keller, Dachboden, Garten/Garage
);

-- Estate Type ↔ Part Type Matrix: which rooms belong to which estate type (~68 rows)
CREATE TABLE transport.estate_type_part_type_map (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_type_id    UUID NOT NULL REFERENCES transport.estate_types(id),
    estate_part_type_id UUID NOT NULL REFERENCES transport.estate_part_types(id),
    is_main_type      BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(estate_type_id, estate_part_type_id)
);

-- Furniture Group Types: categories (Schrank, Regal, Bett, etc.)
CREATE TABLE transport.furniture_group_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        JSONB NOT NULL,
    description JSONB NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Furniture Types: 227 items × 6 languages with volume and assembly costs
CREATE TABLE transport.furniture_types (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    furniture_group_type_id UUID NOT NULL REFERENCES transport.furniture_group_types(id),
    name                   JSONB NOT NULL,
    description            JSONB NOT NULL,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    volume                 DOUBLE PRECISION NOT NULL,  -- m³
    assemblable            BOOLEAN NOT NULL DEFAULT false,
    disassemble_cost       INTEGER,           -- EUR cents (Demontagekosten)
    assemble_cost          INTEGER,           -- EUR cents (Montagekosten)
    flat_rate              INTEGER,           -- EUR cents (Pauschalpreis)
    calculation_type       VARCHAR(20) NOT NULL DEFAULT 'COUNT'  -- COUNT | LINEAR_METER
);
CREATE INDEX idx_furniture_types_group ON transport.furniture_types(furniture_group_type_id);

-- =============================================
-- Instance Data Tables (created per demand)
-- =============================================

-- Addresses in German format
CREATE TABLE transport.addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street          VARCHAR(255) NOT NULL,   -- @pii
    house_number    VARCHAR(20) NOT NULL,    -- @pii
    post_code       VARCHAR(10) NOT NULL,
    place_name      VARCHAR(255) NOT NULL,
    country_code    VARCHAR(3) NOT NULL DEFAULT 'DE',
    additional_info TEXT,
    floor           INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL
);
CREATE INDEX idx_addresses_post_code ON transport.addresses(post_code);

-- Estate: a property being moved from/to
CREATE TABLE transport.estates (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_type_id           UUID NOT NULL,    -- references estate_types (seed data)
    address_id               UUID NOT NULL,    -- references addresses (same schema)
    total_square_meters      DOUBLE PRECISION NOT NULL,
    number_of_floors         INTEGER NOT NULL DEFAULT 1,
    number_of_rooms          INTEGER NOT NULL,
    elevator_type            VARCHAR(20) NOT NULL DEFAULT 'NONE', -- NONE | PERSONAL | FREIGHT
    walking_way_meters       DOUBLE PRECISION NOT NULL DEFAULT 0, -- Trageweg
    halteverbot_required     BOOLEAN NOT NULL DEFAULT false,
    furniture_montage        BOOLEAN NOT NULL DEFAULT false,      -- Möbelmontage
    kitchen_montage          BOOLEAN NOT NULL DEFAULT false,      -- Küchenmontage
    packing_service          BOOLEAN NOT NULL DEFAULT false,      -- Verpackungsservice
    has_cellar               BOOLEAN NOT NULL DEFAULT false,
    cellar_square_meters     DOUBLE PRECISION,
    has_loft                 BOOLEAN NOT NULL DEFAULT false,
    loft_square_meters       DOUBLE PRECISION,
    has_garden_garage        BOOLEAN NOT NULL DEFAULT false,
    garden_garage_square_meters DOUBLE PRECISION,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by               UUID NOT NULL
);

-- Estate Parts (rooms)
CREATE TABLE transport.estate_parts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id           UUID NOT NULL REFERENCES transport.estates(id) ON DELETE CASCADE,
    estate_part_type_id UUID NOT NULL,    -- references estate_part_types (seed data)
    custom_name         VARCHAR(100),     -- e.g., "Schlafzimmer 2"
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_estate_parts_estate ON transport.estate_parts(estate_id);

-- Furniture Items in a room
CREATE TABLE transport.furniture_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_part_id    UUID NOT NULL REFERENCES transport.estate_parts(id) ON DELETE CASCADE,
    furniture_type_id UUID NOT NULL,     -- references furniture_types (seed data)
    quantity          DOUBLE PRECISION NOT NULL,  -- count or linear meters
    calculated_volume DOUBLE PRECISION            -- furniture_type.volume × quantity
);
CREATE INDEX idx_furniture_items_part ON transport.furniture_items(estate_part_id);

-- Transportation record
CREATE TABLE transport.transportations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_type_id     VARCHAR(30) NOT NULL,  -- LOCAL | LONG_DISTANCE | INTERNATIONAL | COMMERCIAL
    status                VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    from_estate_id        UUID NOT NULL REFERENCES transport.estates(id),
    to_estate_id          UUID NOT NULL REFERENCES transport.estates(id),
    from_address_id       UUID NOT NULL REFERENCES transport.addresses(id),
    to_address_id         UUID NOT NULL REFERENCES transport.addresses(id),
    number_of_people      INTEGER NOT NULL,
    preferred_date_start  TIMESTAMPTZ NOT NULL,
    preferred_date_end    TIMESTAMPTZ NOT NULL,
    date_flexibility      BOOLEAN NOT NULL DEFAULT false,
    estimated_volume      DOUBLE PRECISION NOT NULL DEFAULT 0,
    estimated_distance_km DOUBLE PRECISION NOT NULL DEFAULT 0,
    additional_info       TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by            UUID NOT NULL
);

-- Idempotency tracking
CREATE TABLE transport.processed_events (
    idempotency_key TEXT PRIMARY KEY,
    event_id        UUID NOT NULL,
    event_type      TEXT NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 PostCode Data (shared schema, read-only)

Transport module READS from `shared.post_codes` but does NOT write to it. PostCodeService injects PrismaClient and queries the shared schema.

---

## 3. API Specification

### 3.1 GET /api/v1/estate-types

**Auth:** Public
**Purpose:** Return all active estate types, localized.

```yaml
GET /api/v1/estate-types
Headers:
  Accept-Language: de | en  (default: de)

Response 200:
  {
    "success": true,
    "code": "ESTATE_TYPES_RETRIEVED",
    "data": [
      {
        "id": "uuid",
        "name": "Wohnung",          # localized
        "description": "Apartment",  # localized
        "isActive": true
      }
    ],
    "meta": { "timestamp": "...", "traceId": "...", "locale": "de" },
    "errors": []
  }
```

**Implementation Notes:**
- Cache with Redis (TTL: 24h) — seed data rarely changes
- Locale extraction from `Accept-Language` header via NestJS interceptor
- Response: pick single locale from JSONB, not return full object

### 3.2 GET /api/v1/estate-types/:id/part-types

**Auth:** Public
**Purpose:** Return valid room types for an estate type.

```yaml
GET /api/v1/estate-types/{estateTypeId}/part-types
Headers:
  Accept-Language: de | en

Response 200:
  {
    "success": true,
    "code": "PART_TYPES_RETRIEVED",
    "data": [
      {
        "id": "uuid",
        "name": "Wohnzimmer",
        "description": "Living room",
        "isOuterPart": false,
        "isActive": true
      }
    ],
    ...
  }

Response 404:
  {
    "success": false,
    "code": "VAL_INVALID_INPUT",
    "message": "Estate type not found",
    "data": null,
    "errors": [{ "field": "estateTypeId", "message": "Estate type not found", "code": "VAL_INVALID_INPUT" }]
  }
```

**Implementation Notes:**
- JOIN through `estate_type_part_type_map` to get valid part types
- Separate outer parts (isOuterPart: true) — frontend shows them in a different section

### 3.3 GET /api/v1/furniture-types

**Auth:** Public
**Purpose:** Paginated furniture catalog with filters.

```yaml
GET /api/v1/furniture-types?page=1&size=50&groupId=uuid&assemblableOnly=true&search=Schrank
Headers:
  Accept-Language: de | en

Response 200:
  {
    "success": true,
    "code": "FURNITURE_TYPES_RETRIEVED",
    "data": [
      {
        "id": "uuid",
        "name": "Kleiderschrank, 2-türig",
        "description": "2-door wardrobe",
        "furnitureGroupTypeId": "uuid",
        "volume": 1.2,
        "assemblable": true,
        "disassembleCost": 4500,    # EUR cents = €45.00
        "assembleCost": 5500,       # EUR cents = €55.00
        "flatRate": null,
        "calculationType": "COUNT"
      }
    ],
    "meta": { ..., "page": 1, "size": 50, "total": 227 },
    "errors": []
  }
```

**Implementation Notes:**
- `search` parameter: search in localized name JSONB field using PostgreSQL `ILIKE` on extracted locale
- Query: `WHERE name->>$locale ILIKE '%search%'`
- Default page size: 50 (furniture list is browseable)

### 3.4 GET /api/v1/furniture-groups

**Auth:** Public
**Purpose:** Furniture group categories.

```yaml
GET /api/v1/furniture-groups
Response 200:
  {
    "data": [
      { "id": "uuid", "name": "Schränke", "furnitureCount": 15 }
    ]
  }
```

**Implementation Notes:**
- Include count of active furniture types per group
- Cache: Redis TTL 24h

### 3.5 POST /api/v1/transport/estimate-volume

**Auth:** Public
**Purpose:** Calculate total moving volume from furniture selection.

```yaml
POST /api/v1/transport/estimate-volume
Content-Type: application/json

Request:
  {
    "rooms": [
      {
        "estatePartTypeId": "uuid",
        "furniture": [
          { "furnitureTypeId": "uuid", "quantity": 3 },
          { "furnitureTypeId": "uuid", "quantity": 1.5 }
        ]
      }
    ]
  }

Response 200:
  {
    "success": true,
    "code": "VOLUME_ESTIMATED",
    "data": {
      "totalVolume": 28.5,       # m³
      "totalItems": 47,
      "assemblyRequired": true,
      "roomBreakdown": [
        {
          "estatePartTypeId": "uuid",
          "roomVolume": 12.3,
          "itemCount": 15
        }
      ]
    }
  }

Response 400 (validation):
  {
    "success": false,
    "code": "VAL_INVALID_INPUT",
    "errors": [
      { "field": "rooms[0].furniture[0].quantity", "message": "Quantity must be positive", "code": "VAL_INVALID_INPUT" }
    ]
  }
```

**Implementation Notes:**
- Stateless calculation — does NOT persist anything
- For each furniture item: `calculatedVolume = furnitureType.volume × quantity`
- For LINEAR_METER types: quantity is meters, not count
- `assemblyRequired`: true if ANY selected furniture has `assemblable = true`
- Validate all furnitureTypeIds exist and are active

### 3.6 GET /api/v1/post-codes/:code

**Auth:** Public
**Purpose:** PLZ lookup with geo-coordinates.

```yaml
GET /api/v1/post-codes/40213

Response 200:
  {
    "data": {
      "postCode": "40213",
      "placeName": "Düsseldorf",
      "adminName1": "Nordrhein-Westfalen",
      "adminName2": "Düsseldorf",
      "latitude": 51.2277,
      "longitude": 6.7735,
      "countryCode": "DE"
    }
  }

Response 404:
  {
    "success": false,
    "code": "VAL_INVALID_PLZ",
    "message": "Postal code not found"
  }
```

**Implementation Notes:**
- Query `shared.post_codes` table (cross-schema read)
- MVP: only German PLZ (countryCode = 'DE')
- Cache: Redis TTL 1h (PLZ data is static but frequently queried)

---

## 4. Class & Interface Design

### 4.1 Module Structure

```
src/modules/transport/
├── transport.module.ts
├── controllers/
│   ├── estate-type.controller.ts
│   ├── furniture-type.controller.ts
│   ├── post-code.controller.ts
│   └── volume-estimate.controller.ts
├── services/
│   ├── estate-type.service.ts
│   ├── furniture-type.service.ts
│   ├── post-code.service.ts
│   ├── volume-calculator.service.ts
│   └── transport.service.ts          # internal — called by Demand module
├── dto/
│   ├── estate-type-response.dto.ts
│   ├── furniture-type-response.dto.ts
│   ├── furniture-type-filter.dto.ts
│   ├── post-code-response.dto.ts
│   ├── estimate-volume-request.dto.ts
│   └── estimate-volume-response.dto.ts
└── helpers/
    ├── locale-extractor.ts           # Extract locale from Accept-Language
    └── haversine.ts                  # Distance calculation from lat/lng
```

### 4.2 Key Classes

```typescript
// transport.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [
    EstateTypeController,
    FurnitureTypeController,
    PostCodeController,
    VolumeEstimateController,
  ],
  providers: [
    EstateTypeService,
    FurnitureTypeService,
    PostCodeService,
    VolumeCalculatorService,
    TransportService,
  ],
  exports: [TransportService], // Demand module imports TransportModule
})
export class TransportModule {}
```

```typescript
// services/estate-type.service.ts
@Injectable()
export class EstateTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(locale: string): Promise<EstateTypeResponseDto[]> {
    const types = await this.prisma.estateType.findMany({
      where: { isActive: true },
    });
    return types.map((t) => this.toLocalizedDto(t, locale));
  }

  async findPartTypes(estateTypeId: string, locale: string): Promise<EstatePartTypeResponseDto[]> {
    const mappings = await this.prisma.estateTypePartTypeMap.findMany({
      where: { estateTypeId },
      include: { estatePartType: true },
    });
    if (mappings.length === 0) {
      throw new NotFoundException('Estate type not found');
    }
    return mappings
      .filter((m) => m.estatePartType.isActive)
      .map((m) => this.partTypeToDto(m.estatePartType, locale));
  }

  private toLocalizedDto(entity: EstateType, locale: string): EstateTypeResponseDto {
    const name = entity.name as Record<string, string>;
    const desc = entity.description as Record<string, string>;
    return {
      id: entity.id,
      name: name[locale] ?? name['de'],         // fallback to DE
      description: desc[locale] ?? desc['de'],
      isActive: entity.isActive,
    };
  }
}
```

```typescript
// services/volume-calculator.service.ts
@Injectable()
export class VolumeCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async estimate(request: EstimateVolumeRequestDto): Promise<EstimateVolumeResponseDto> {
    // 1. Collect all unique furniture type IDs
    const furnitureTypeIds = this.extractFurnitureTypeIds(request);

    // 2. Batch fetch furniture types (single query)
    const furnitureTypes = await this.prisma.furnitureType.findMany({
      where: { id: { in: furnitureTypeIds }, isActive: true },
    });
    const typeMap = new Map(furnitureTypes.map((ft) => [ft.id, ft]));

    // 3. Validate all requested IDs exist
    for (const id of furnitureTypeIds) {
      if (!typeMap.has(id)) {
        throw new BadRequestException(`Furniture type not found: ${id}`);
      }
    }

    // 4. Calculate per-room and total
    let totalVolume = 0;
    let totalItems = 0;
    let assemblyRequired = false;
    const roomBreakdown: RoomBreakdown[] = [];

    for (const room of request.rooms) {
      let roomVolume = 0;
      let itemCount = 0;

      for (const item of room.furniture) {
        const ft = typeMap.get(item.furnitureTypeId)!;
        const volume = ft.volume * item.quantity;
        roomVolume += volume;
        itemCount += item.quantity;
        if (ft.assemblable) assemblyRequired = true;
      }

      totalVolume += roomVolume;
      totalItems += itemCount;
      roomBreakdown.push({
        estatePartTypeId: room.estatePartTypeId,
        roomVolume: Math.round(roomVolume * 100) / 100,  // 2 decimal places
        itemCount,
      });
    }

    return {
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalItems,
      assemblyRequired,
      roomBreakdown,
    };
  }
}
```

```typescript
// services/transport.service.ts (internal — not exposed via controller)
@Injectable()
export class TransportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates full transportation record with estates, rooms, furniture, addresses.
   * Called internally by Demand module during demand creation.
   *
   * Uses a Prisma transaction to ensure atomicity.
   */
  async createTransportation(params: CreateTransportationParams): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create from/to addresses
      const fromAddress = await tx.address.create({ data: params.fromAddress });
      const toAddress = await tx.address.create({ data: params.toAddress });

      // 2. Create from/to estates with rooms and furniture
      const fromEstate = await this.createEstateWithParts(tx, params.fromEstate, fromAddress.id);
      const toEstate = await this.createEstateWithParts(tx, params.toEstate, toAddress.id);

      // 3. Calculate volume
      const estimatedVolume = await this.calculateVolume(tx, fromEstate.id);

      // 4. Calculate distance (Haversine from PLZ coordinates)
      const estimatedDistanceKm = this.calculateDistance(
        params.fromAddress.postCode,
        params.toAddress.postCode,
      );

      // 5. Create transportation record
      const transportation = await tx.transportation.create({
        data: {
          transportTypeId: params.transportType,
          fromEstateId: fromEstate.id,
          toEstateId: toEstate.id,
          fromAddressId: fromAddress.id,
          toAddressId: toAddress.id,
          numberOfPeople: params.numberOfPeople,
          preferredDateStart: params.preferredDateStart,
          preferredDateEnd: params.preferredDateEnd,
          dateFlexibility: params.dateFlexibility,
          estimatedVolume,
          estimatedDistanceKm,
          additionalInfo: params.additionalInfo,
          createdBy: params.userId,
        },
      });

      // 6. Emit event
      this.eventEmitter.emit('TRANSPORT_CREATED', {
        eventId: randomUUID(),
        type: 'TRANSPORT_CREATED',
        timestamp: new Date(),
        sourceModule: 'transport',
        triggeredBy: params.userId,
        correlationId: params.correlationId,
        payload: {
          transportationId: transportation.id,
          fromPostCode: params.fromAddress.postCode,
          toPostCode: params.toAddress.postCode,
          estimatedVolume,
          estimatedDistanceKm,
          preferredDateStart: params.preferredDateStart,
          preferredDateEnd: params.preferredDateEnd,
        },
        idempotencyKey: transportation.id,
      });

      return transportation.id;
    });
  }
}
```

### 4.3 DTO Validation

```typescript
// dto/estimate-volume-request.dto.ts
export class EstimateVolumeRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomDto)
  @ArrayMinSize(1)
  rooms: RoomDto[];
}

export class RoomDto {
  @IsUUID()
  estatePartTypeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FurnitureItemDto)
  @ArrayMinSize(1)
  furniture: FurnitureItemDto[];
}

export class FurnitureItemDto {
  @IsUUID()
  furnitureTypeId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}
```

---

## 5. Security Controls

### 5.1 Authentication & Authorization

| Endpoint | Auth | Notes |
|----------|------|-------|
| `GET /estate-types` | Public | Seed data, no sensitive info |
| `GET /estate-types/:id/part-types` | Public | Seed data |
| `GET /furniture-types` | Public | Seed data, pricing is reference only |
| `GET /furniture-groups` | Public | Seed data |
| `POST /transport/estimate-volume` | Public | Stateless calculation |
| `GET /post-codes/:code` | Public | Public geographic data |
| `TransportService.create()` | Internal | Only callable by DemandModule (not via HTTP) |

All 6 public endpoints use `@Public()` decorator to skip JWT validation.

### 5.2 Input Validation

- **UUID parameters:** Validated by `@IsUUID()` pipe
- **PLZ code:** Regex validation `^[0-9]{5}$` for German PLZ
- **Pagination:** `page >= 1`, `size` between 1-100, enforced by ValidationPipe
- **Volume request:** `quantity > 0`, `rooms.length >= 1`

### 5.3 Rate Limiting

- Public endpoints: 200 req/min per IP (APISIX gateway)
- `POST /transport/estimate-volume`: 60 req/min per IP (computation cost)

### 5.4 PII

Transport module handles PII in addresses (`street`, `houseNumber`). These fields:
- Are marked with `/// @pii` in Prisma schema
- Must be masked in structured logs
- Must be included in GDPR erasure cascade (anonymize, not delete — for legal retention)

---

## 6. Sequence Diagrams

### 6.1 Volume Estimation (Happy Path)

```
Client                  Controller              Service                 Prisma/DB
  │                         │                      │                       │
  │ POST /estimate-volume   │                      │                       │
  │ { rooms: [...] }        │                      │                       │
  │────────────────────────>│                      │                       │
  │                         │ validate DTO         │                       │
  │                         │──────────────────────>│                      │
  │                         │                      │ extract furniture IDs │
  │                         │                      │──────────────────────>│
  │                         │                      │ SELECT furniture_types│
  │                         │                      │ WHERE id IN (...)     │
  │                         │                      │<──────────────────────│
  │                         │                      │                       │
  │                         │                      │ validate all IDs exist│
  │                         │                      │ calculate per-room    │
  │                         │                      │ sum total volume      │
  │                         │                      │ check assemblyReq.    │
  │                         │                      │                       │
  │                         │<──────────────────────│                      │
  │                         │ wrap in ApiResponse   │                       │
  │<────────────────────────│                      │                       │
  │ 200 { totalVolume: 28.5 }                      │                       │
```

### 6.2 Transport Creation (Internal, via Demand)

```
DemandService           TransportService         Prisma/DB           EventEmitter
  │                         │                       │                    │
  │ createTransportation()  │                       │                    │
  │────────────────────────>│                       │                    │
  │                         │ $transaction BEGIN    │                    │
  │                         │──────────────────────>│                    │
  │                         │                       │                    │
  │                         │ INSERT address (from) │                    │
  │                         │──────────────────────>│                    │
  │                         │ INSERT address (to)   │                    │
  │                         │──────────────────────>│                    │
  │                         │ INSERT estate (from)  │                    │
  │                         │  + parts + furniture  │                    │
  │                         │──────────────────────>│                    │
  │                         │ INSERT estate (to)    │                    │
  │                         │  + parts + furniture  │                    │
  │                         │──────────────────────>│                    │
  │                         │ SUM calculated_volume │                    │
  │                         │──────────────────────>│                    │
  │                         │ INSERT transportation │                    │
  │                         │──────────────────────>│                    │
  │                         │ $transaction COMMIT   │                    │
  │                         │──────────────────────>│                    │
  │                         │                       │                    │
  │                         │ emit TRANSPORT_CREATED│                    │
  │                         │───────────────────────────────────────────>│
  │                         │                       │                    │
  │<────────────────────────│                       │                    │
  │ transportationId        │                       │                    │
```

---

## 7. Error Handling & Resilience

### 7.1 Error Scenarios

| Scenario | Error Code | HTTP Status | Recovery |
|----------|-----------|-------------|---------|
| Estate type ID not found | VAL_INVALID_INPUT | 404 | Return error, no retry |
| Furniture type ID not found | VAL_INVALID_INPUT | 400 | Return error with invalid ID |
| PLZ not found | VAL_INVALID_PLZ | 404 | Return error |
| Invalid quantity (≤ 0) | VAL_INVALID_INPUT | 400 | Validation error |
| DB connection failure | SYS_DATABASE_ERROR | 500 | Circuit breaker, retry 3x |
| Redis cache failure | (silent) | 200 | Fallback to DB query |
| Transaction failure (create) | SYS_DATABASE_ERROR | 500 | Prisma auto-rollback |

### 7.2 Resilience Patterns

- **Redis cache**: Fail-open — if Redis is down, skip cache, query DB directly
- **DB**: Prisma connection pool (default 5 connections, configurable)
- **No external service calls**: Transport module has no external dependencies (Stripe, email, etc.)

---

## 8. Performance Considerations

### 8.1 Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|------|----------|-----|-------------|
| Estate types | `transport:estate_types:{locale}` | 24h | Manual (seed data change) |
| Part types per estate | `transport:part_types:{estateTypeId}:{locale}` | 24h | Manual |
| Furniture groups | `transport:furniture_groups:{locale}` | 24h | Manual |
| Furniture types page | `transport:furniture:{locale}:{page}:{size}:{filters}` | 1h | Manual |
| PostCode lookup | `transport:plz:{code}` | 1h | Never (static data) |

### 8.2 Database Indexing

Defined in Prisma schema. Key indexes:
- `furniture_types(furniture_group_type_id)` — group filter
- `estate_type_part_type_map(estate_type_id, estate_part_type_id)` UNIQUE — matrix lookup
- `estate_parts(estate_id)` — room lookup
- `furniture_items(estate_part_id)` — furniture per room
- `addresses(post_code)` — PLZ lookup
- `post_codes(post_code)` — PLZ lookup (shared schema)

### 8.3 Query Optimization

- **Volume calculation**: Single batch query for all furniture types (not N+1)
- **Localization**: Extract locale from JSONB at application level (not DB function) for cacheability
- **Furniture search**: PostgreSQL `ILIKE` on extracted locale text — consider GIN index for Phase 2

---

## 9. Monitoring & Observability

### 9.1 Metrics

```yaml
metrics:
  cds_transport_estate_types_requests_total:
    type: counter
    labels: [locale]
  cds_transport_furniture_types_requests_total:
    type: counter
    labels: [locale, has_search, has_group_filter]
  cds_transport_volume_estimates_total:
    type: counter
  cds_transport_volume_estimate_result:
    type: histogram
    description: "Distribution of estimated volumes (m³)"
    buckets: [5, 10, 20, 30, 50, 100]
  cds_transport_plz_lookups_total:
    type: counter
    labels: [found]   # true/false
  cds_transport_plz_cache_hit_ratio:
    type: gauge
```

### 9.2 Logging

```json
{
  "level": "INFO",
  "module": "transport",
  "action": "volume_estimate",
  "context": {
    "room_count": 5,
    "total_items": 47,
    "total_volume_m3": 28.5,
    "assembly_required": true,
    "duration_ms": 12
  }
}
```

### 9.3 Health Check

```typescript
// Transport module contributes to NestJS health check:
// - DB connectivity (Prisma ping)
// - Redis connectivity (cache ping)
// - Seed data loaded (estate_types count > 0)
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Service | Test Cases |
|---------|-----------|
| `VolumeCalculatorService` | Empty rooms, single item, multiple rooms, LINEAR_METER type, invalid furniture ID, zero quantity validation |
| `EstateTypeService` | Localization fallback (missing EN → fallback DE), inactive types filtered, invalid estate type ID |
| `PostCodeService` | Valid PLZ, invalid PLZ, non-DE country code |
| `Haversine helper` | Known distance pairs (Düsseldorf↔Berlin = ~478km), same point = 0 |

### 10.2 Integration Tests (Testcontainers)

| Test | Description |
|------|------------|
| Seed data integrity | Load Estate.xlsx → verify 4 estate types, 17 part types, 227 furniture types |
| Volume calculation e2e | Seed → select furniture → calculate → verify against known volumes |
| PLZ lookup e2e | Load PostCodeData.csv → query 40213 → verify Düsseldorf |
| Transport creation | Create full transportation → verify cascade (addresses, estates, parts, items) |

---

## 11. Reviewer Checklist

- [ ] DB schema matches Prisma schema exactly
- [ ] All 6 public endpoints have `@Public()` decorator
- [ ] Money fields are integer cents (disassembleCost, assembleCost, flatRate)
- [ ] JSONB localization pattern consistent (fallback to 'de')
- [ ] Volume calculation is stateless (no side effects)
- [ ] TransportService.create() uses Prisma $transaction
- [ ] PII fields (street, houseNumber) marked and masked in logs
- [ ] All furniture type IDs validated before calculation
- [ ] Redis cache fail-open pattern implemented
- [ ] Error codes match api-contracts.ts ErrorCode taxonomy
- [ ] Haversine distance calculation tested with known values

---

*Last updated: 2026-03-04*
