# High-Level Design: CDS Platform — Moving Services MVP

**Version:** 1.0.0
**Date:** 2026-03-03
**Authors:** Mimar (Architect) + Muhendis (Engineer)
**Status:** DRAFT — Pending team review
**Domain Model Reference:** `docs/domain-model/*.ts`
**Decisions Reference:** `docs/team/decisions.md` (D-001 through D-017)

---

## 1. System Scope & Goals

### Business Problem
Traditional moving service platforms (Umzüge24, Movinga) charge 15-25% commission, creating cost inefficiencies for both providers (Umzugsunternehmen) and customers. There is no transparency in pricing, no legally structured contracts, and no economic mechanism to ensure service quality.

### Solution
CDS (Community Driven Services) Moving Platform — a low-commission (3-5%) marketplace for moving services in Germany, featuring transparent pricing, deposit-based quality assurance, and digitally structured service contracts.

### Success Metrics
- **MVP Launch:** Functional platform with real payments within 3 months
- **Provider Onboarding:** 10+ moving companies registered in MVP phase
- **First Transaction:** At least 1 real paid moving service completed through the platform
- **Commission Target:** Platform commission at 3-5% (validated through real transactions)
- **User Satisfaction:** NPS > 30 from both providers and customers

### Key Capabilities
1. Customer demand creation (Umzugsanfrage) with room-by-room furniture inventory
2. Provider marketplace with competitive bidding
3. Transparent price breakdown (transport + Möbelmontage + Küchenmontage + Verpackung + Halteverbot)
4. Deposit/stake mechanism for provider quality assurance (Kaution)
5. Digital service contracts with mutual acceptance + PDF generation
6. Real payment processing via Stripe Connect Europe (3-5% commission split)
7. Bidirectional review system

### Out of Scope (Deferred to Phase 2+)
- Light node / mobile verification network
- AI-powered matching and price prediction
- Multi-sector support (non-moving services)
- Automated dispute resolution engine
- Qualified electronic signatures (eIDAS)
- Push notifications, SMS, in-app notifications
- Multi-currency support (MVP: EUR only)

### Target Market
- **Country:** Germany (first)
- **Expansion:** DACH (Austria, Switzerland) → broader EU
- **Languages:** German + English (MVP)
- **Currency:** EUR

---

## 2. Platform Architecture

### 2.1 System Overview

```
                        ┌──────────────────┐
                        │   React SPA      │
                        │ (Refine + i18n)  │
                        └────────┬─────────┘
                                 │ HTTPS
                        ┌────────▼─────────┐
                        │   APISIX Gateway │
                        │ (Rate limit,CORS,│
                        │  Auth, WAF)      │
                        └────────┬─────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │     NestJS Modular Monolith   │
                 │                               │
                 │  ┌─────┐ ┌──────┐ ┌────────┐ │
                 │  │Auth │ │Demand│ │ Offer  │ │
                 │  └──┬──┘ └──┬───┘ └───┬────┘ │
                 │     │       │         │       │
                 │  ┌──▼──┐ ┌─▼──────┐ ┌▼─────┐ │
                 │  │Prov.│ │Transp. │ │Contr.│ │
                 │  └──┬──┘ └──┬─────┘ └──┬───┘ │
                 │     │       │          │      │
                 │  ┌──▼──┐ ┌─▼──────┐ ┌─▼───┐ │
                 │  │Paym.│ │Review  │ │Notif│ │
                 │  └─────┘ └────────┘ └─────┘ │
                 │                               │
                 │  ┌──────────────────────────┐ │
                 │  │  NestJS EventEmitter     │ │
                 │  │  (in-process event bus)  │ │
                 │  └──────────────────────────┘ │
                 └───────┬──────┬──────┬─────────┘
                         │      │      │
              ┌──────────▼┐ ┌──▼───┐ ┌▼────────┐
              │PostgreSQL │ │Redis │ │  Kafka   │
              │(multi-    │ │Cache │ │(notif.   │
              │ schema)   │ │      │ │ only MVP)│
              └───────────┘ └──────┘ └─────────┘
                                          │
              ┌───────────┐          ┌────▼────┐
              │ Keycloak  │          │  Email  │
              │  (OIDC)   │          │ Service │
              └───────────┘          └─────────┘
                    │
              ┌─────▼─────┐
              │  Stripe   │
              │ Connect   │
              │ Europe    │
              └───────────┘
```

### 2.2 Standard Stack

| Layer | Technology | Configuration |
|-------|-----------|---------------|
| **Auth** | Keycloak 24+ | OAuth2/OIDC, JWT tokens, single `cds` realm with composite roles |
| **Gateway** | APISIX | Rate limiting, CORS, JWT validation, request logging |
| **Frontend** | React 18 + TypeScript + Refine | react-intl (DE/EN), corporate design system |
| **Backend** | NestJS (TypeScript) | Modular monolith, 9 domain modules |
| **ORM** | Prisma (multi-file schema) | One `.prisma` file per module, multi-schema PostgreSQL |
| **Database** | PostgreSQL 18.1+ | 9 schemas (shared, demand, offer, transport, provider, contract, payment, review, notification) |
| **Cache** | Redis 7+ | Session data, rate limiting, demand listing cache |
| **Message Broker** | Kafka (KRaft) | MVP: notification topic only. Phase 2: full event streaming |
| **Payment** | Stripe Connect Europe | Hosted checkout, SCA/PSD2 compliant, SAQ A |
| **Monitoring** | Prometheus + Grafana | System + business metrics |
| **Logging** | Loki | Structured JSON, PII masking |
| **Tracing** | OpenTelemetry → Jaeger | Distributed tracing across modules |
| **File Storage** | MinIO (S3-compatible) | Contract PDFs, provider documents |

### 2.3 Event Architecture

**MVP Event Strategy:** NestJS `@nestjs/event-emitter` (in-process, synchronous). Provides effective strong consistency within request cycle.

**Phase 2 Migration Path:** Replace EventEmitter with Kafka producers/consumers. Module boundaries already enforce loose coupling.

**Event Design Principles (MANDATORY):**
1. Every event handler MUST be idempotent — processing the same event twice produces no additional side effects
2. Every event MUST carry a unique `eventId` (UUID) + `timestamp`
3. Handlers SHOULD check for duplicate processing (via `processedEventIds` or entity version)
4. Events are facts (past tense): `OfferAccepted`, `PaymentCompleted`, not `AcceptOffer`

---

## 3. Module Decomposition

### 3.1 Auth Module (`AuthModule`)

**Schema:** `shared`
**Primary Responsibility:** Keycloak integration, user profile management, consent tracking.

**Key Features:**
1. Keycloak OIDC integration (login, register, token refresh)
2. User profile management (customer and provider views)
3. GDPR consent management (consent records with timestamps)
4. Cookie consent tracking

**Dependencies:**
- Keycloak (external IdP)

**APIs Exposed:**
- `GET /api/v1/auth/profile` — Get current user profile
- `PATCH /api/v1/auth/profile` — Update profile
- `POST /api/v1/auth/consent` — Record GDPR consent
- `GET /api/v1/auth/consent` — Get consent status
- `GET /api/v1/auth/data-export` — GDPR data portability (export user data as JSON)
- `DELETE /api/v1/auth/account` — GDPR right to erasure

**Events Published:**
- `UserRegistered` — New user created in Keycloak
- `UserProfileUpdated` — Profile data changed
- `UserDeleted` — Account erasure completed (GDPR)

**Events Consumed:** None (source of truth for user data)

**Data Storage:**
- `shared.user_references` — Denormalized user info (updated via Keycloak events)
- `shared.consent_records` — GDPR consent log
- `shared.enum_types` — Status enums
- `shared.countries` — Country lookup (seed: Country.csv)
- `shared.post_codes` — PLZ lookup (seed: PostCodeData.csv)

---

### 3.2 Provider Module (`ProviderModule`)

**Schema:** `provider`
**Primary Responsibility:** Moving company onboarding, profile management, deposit/stake lifecycle.

**Key Features:**
1. Provider company registration and profile
2. Deposit payment and lifecycle (Kaution)
3. Service area definition (PLZ prefix-based)
4. Document upload and verification (Gewerbeschein, Versicherungsnachweis)
5. Employee management (Owner, Dispatcher, Worker roles)
6. Denormalized rating aggregates (from review events)

**Dependencies:**
- `auth` — User identity
- `payment` — Deposit processing via Stripe
- `review` — Rating aggregates (event-driven)

**APIs Exposed:**
- `POST /api/v1/providers` — Register new provider company
- `GET /api/v1/providers/:id` — Get provider profile (public view)
- `GET /api/v1/providers` — List providers (admin)
- `PATCH /api/v1/providers/:id` — Update provider profile
- `POST /api/v1/providers/:id/documents` — Upload verification document
- `GET /api/v1/providers/:id/coverage` — Get service coverage areas
- *Deposit initiation:* via Payment Module (`POST /api/v1/payments/deposits`)

**Events Published:**
- `ProviderRegistered` — New company registered
- `ProviderActivated` — Deposit paid, profile complete, ready to bid
- `ProviderSuspended` — Account suspended
- `ProviderDeactivated` — Account deactivated

**Events Consumed:**
- `DepositReceived` (from payment) — Activate provider
- `ReviewAggregateUpdated` (from review) — Update rating stats

**Onboarding Flow:**
```
Register → Complete profile → Upload documents → Pay deposit (Kaution)
    → ACTIVE (can submit offers)
```

**Data Storage:**
- `provider.companies` — Provider company profiles
- `provider.employees` — Company employees
- `provider.documents` — Uploaded verification documents

---

### 3.3 Demand Module (`DemandModule`)

**Schema:** `demand`
**Primary Responsibility:** Customer moving request lifecycle. Orchestrates estate/transport creation across modules.

**Key Features:**
1. Demand creation with full moving details (rooms, furniture, addresses)
2. Demand lifecycle management (DRAFT → PUBLISHED → ACCEPTED → COMPLETED)
3. Orchestration: receives full payload, dispatches estate/transport to transport module
4. Denormalized offer count (from offer events)

**Dependencies:**
- `auth` — Customer identity
- `transport` — Estate and transportation data persistence (orchestrated)
- `offer` — Offer count denormalization (event-driven)

**APIs Exposed:**
- `POST /api/v1/demands` — Create new demand (orchestration endpoint)
- `GET /api/v1/demands/:id` — Get demand details
- `GET /api/v1/demands` — List demands (with filters: status, location, date)
- `PATCH /api/v1/demands/:id` — Update demand
- `DELETE /api/v1/demands/:id` — Cancel demand

**Events Published:**
- `DemandCreated` — New demand published
- `DemandStatusChanged` — Status transition
- `DemandCancelled` — Demand cancelled

**Events Consumed:**
- `OfferAccepted` (from offer) — Update status to ACCEPTED, store acceptedOfferId
- `OfferStatsUpdated` (from offer) — Update offerCount

**Data Storage:**
- `demand.demands` — Demand records

**Architecture Note:** `CreateDemandRequest` is an orchestration DTO. Demand module receives the full payload (demand + transportation + estates + addresses), creates the demand record, then dispatches sub-requests to the transport module via in-process calls. No cross-schema writes.

---

### 3.4 Offer Module (`OfferModule`)

**Schema:** `offer`
**Primary Responsibility:** Provider bidding mechanism, offer lifecycle, price transparency.

**Key Features:**
1. Offer submission with price breakdown (CDS transparency principle)
2. Offer acceptance/rejection by customer
3. Offer statistics (min/max/average price per demand)
4. Commission calculation (3-5% platform fee)
5. Offer expiration (auto-reject after validity period)

**Dependencies:**
- `demand` — Demand existence validation
- `provider` — Provider status validation (must be ACTIVE)
- `contract` — Triggers contract creation on acceptance (event)

**APIs Exposed:**
- `POST /api/v1/demands/:demandId/offers` — Submit offer
- `GET /api/v1/demands/:demandId/offers` — List offers for a demand
- `GET /api/v1/offers/:id` — Get offer details
- `POST /api/v1/offers/:id/accept` — Customer accepts offer
- `POST /api/v1/offers/:id/reject` — Customer rejects offer
- `POST /api/v1/offers/:id/withdraw` — Provider withdraws offer

**Events Published:**
- `OfferSubmitted` — New offer on a demand
- `OfferAccepted` — Customer accepted an offer
- `OfferRejected` — Customer rejected an offer
- `OfferStatsUpdated` — Aggregated stats recalculated

**Events Consumed:**
- `DemandCancelled` (from demand) — Auto-reject all pending offers

**Data Storage:**
- `offer.offers` — Offer records with price breakdown

**Event Ordering (Critical):**
```
1. Customer clicks "Accept" on offer
2. Offer module: set offer.status = ACCEPTED
3. Offer module: publish OfferAccepted event
4. Demand module (listener): set demand.status = ACCEPTED, demand.acceptedOfferId = offerId
5. Contract module (listener): create contract in DRAFT status
6. Notification module (listener): send emails to both parties
```

---

### 3.5 Transport Module (`TransportModule`)

**Schema:** `transport`
**Primary Responsibility:** Moving-specific domain data — estates, rooms, furniture, addresses, transportation details.

**Key Features:**
1. Estate management (property details, rooms, furniture inventory)
2. Address management (German format: Straße + Hausnummer + PLZ + Ort)
3. Transportation details (date, route, volume calculation)
4. Seed data management (227 furniture types, 17 room types, 4 estate types — 6 languages)
5. Volume calculation (total m³ from furniture selection)

**Dependencies:**
- `demand` — Receives estate/transport creation requests via orchestration

**APIs Exposed:**
- `GET /api/v1/estate-types` — List estate types (localized)
- `GET /api/v1/estate-types/:id/part-types` — List valid room types for an estate type
- `GET /api/v1/furniture-types` — List furniture types (localized, with volume/cost)
- `GET /api/v1/furniture-groups` — List furniture groups
- `POST /api/v1/transport/estimate-volume` — Calculate total moving volume (m³)
- `GET /api/v1/post-codes/:code` — PLZ lookup (address validation, geo-coordinates)

**Events Published:**
- `TransportCreated` — Transportation record created
- `VolumeCalculated` — Total moving volume computed

**Events Consumed:**
- `DemandCreated` (from demand, via orchestration) — Create estate + address + transport records

**Data Storage:**
- `transport.estate_types` — Seed: 4 types × 6 languages
- `transport.estate_part_types` — Seed: 17 room types × 6 languages
- `transport.furniture_group_types` — Seed: furniture categories
- `transport.furniture_types` — Seed: 227 items × 6 languages + volume + costs
- `transport.estate_type_part_type_map` — Seed: estate↔room matrix
- `transport.estates` — Estate instances
- `transport.estate_parts` — Room instances with furniture
- `transport.transportations` — Transportation records
- `transport.addresses` — Address records (German format)

---

### 3.6 Contract Module (`ContractModule`)

**Schema:** `contract`
**Primary Responsibility:** Digital service contract generation, mutual acceptance flow, PDF creation.

**Key Features:**
1. Auto-generate contract when offer is accepted
2. Mutual acceptance flow (customer + provider each click "Ich akzeptiere")
3. Timestamped PDF generation (HTML template → PDF)
4. PDF delivery via email to both parties
5. Contract cancellation with reason

**Dependencies:**
- `offer` — Triggers contract creation (event-driven)
- `demand` — Demand details for contract content
- `transport` — Estate/address details for contract content
- `notification` — PDF delivery email

**APIs Exposed:**
- `GET /api/v1/contracts/:id` — Get contract details
- `POST /api/v1/contracts/:id/accept` — Accept contract (customer or provider)
- `POST /api/v1/contracts/:id/cancel` — Cancel contract
- `GET /api/v1/contracts/:id/pdf` — Download contract PDF

**Events Published:**
- `ContractCreated` — New contract in DRAFT
- `ContractActive` — Both parties accepted
- `ContractFulfilled` — Service completed
- `ContractCancelled` — Contract cancelled

**Events Consumed:**
- `OfferAccepted` (from offer) — Create contract DRAFT
- `PaymentCompleted` (from payment) — Mark service as paid
- `TransportDelivered` (from transport) — Trigger fulfillment flow

**MVP Contract Flow:**
```
OfferAccepted event → Contract DRAFT created
  → Customer clicks "Ich akzeptiere" → CUSTOMER_ACCEPTED
  → Provider clicks "Ich akzeptiere" → ACTIVE
  → System generates PDF → Email to both parties
  → Service completed → FULFILLED
  → Payment processed → Closed
```

**Data Storage:**
- `contract.contracts` — Contract records
- `contract.contract_templates` — HTML templates per locale (DE, EN)

---

### 3.7 Payment Module (`PaymentModule`)

**Schema:** `payment`
**Primary Responsibility:** Payment processing via Stripe Connect Europe, commission splitting, deposit management.

**Key Features:**
1. Hosted checkout sessions (Stripe Checkout — SAQ A, no card data)
2. Commission split (platform 3-5% via Stripe Connect destination charges)
3. Provider deposit (Kaution) collection via Stripe SetupIntent
4. Webhook handling (payment confirmations, failures)
5. Provider payout tracking
6. Transaction audit trail

**Dependencies:**
- Stripe Connect Europe (external)
- `contract` — Payment is linked to a contract
- `provider` — Provider activation on deposit

**APIs Exposed:**
- `POST /api/v1/payments/checkout` — Create Stripe checkout session
- `POST /api/v1/payments/webhook` — Stripe webhook endpoint
- `GET /api/v1/payments/transactions/:id` — Get transaction details
- `GET /api/v1/payments/transactions` — List transactions (provider or customer view)
- `POST /api/v1/payments/deposits` — Initiate provider deposit (Stripe checkout for Kaution)
- `POST /api/v1/payments/reconcile` — Manual Stripe reconciliation (admin-only)

**Events Published:**
- `PaymentCompleted` — Customer payment confirmed
- `PaymentFailed` — Payment attempt failed
- `ProviderPayoutCompleted` — Funds transferred to provider
- `DepositReceived` — Provider deposit confirmed
- `RefundCompleted` — Refund processed

**Events Consumed:**
- `ContractActive` (from contract) — Enable payment for this contract

**Stripe Integration Architecture:**
```
Customer clicks "Pay" → POST /payments/checkout
  → Create Stripe CheckoutSession (amount, commission split, connected account)
  → Redirect to Stripe hosted page (SCA/3DS handled by Stripe)
  → Customer pays → Stripe webhook POST /payments/webhook
  → Verify signature → Update PaymentTransaction status
  → Publish PaymentCompleted event
  → Stripe auto-transfers net amount to provider connected account
```

**Data Storage:**
- `payment.transactions` — Payment records with Stripe references
- No card data stored (SAQ A compliance)

---

### 3.8 Review Module (`ReviewModule`)

**Schema:** `review`
**Primary Responsibility:** Bidirectional rating system — customers rate providers and providers rate customers.

**Key Features:**
1. Bidirectional reviews (customer → provider, provider → customer)
2. Aspect-based rating (Pünktlichkeit, Sorgfalt, Freundlichkeit, Preis-Leistung)
3. Rating aggregate calculation (per provider)
4. Review visibility rules (both reviews published simultaneously)

**Dependencies:**
- `contract` — Review only possible after contract is FULFILLED
- `provider` — Rating aggregate updates (event-driven)

**APIs Exposed:**
- `POST /api/v1/contracts/:contractId/reviews` — Submit review
- `GET /api/v1/providers/:id/reviews` — Get provider reviews (public, paginated)
- `GET /api/v1/reviews/:id` — Get review details
- `GET /api/v1/providers/:id/rating` — Provider rating aggregate (public)

**Events Published:**
- `ReviewSubmitted` — New review created
- `ReviewAggregateUpdated` — Provider rating stats recalculated

**Events Consumed:**
- `ContractFulfilled` (from contract) — Enable review submission

**Data Storage:**
- `review.reviews` — Review records with aspect ratings
- `review.review_aggregates` — Cached provider rating statistics

---

### 3.9 Notification Module (`NotificationModule`)

**Schema:** `notification`
**Primary Responsibility:** Email notifications triggered by domain events, with persistent delivery tracking and retry.

**Key Features:**
1. Event-driven email dispatch (13 notification types)
2. Localized templates (DE + EN)
3. Persistent delivery status tracking (for retry logic)
4. Kafka consumer for async processing (MVP: EventEmitter in-process)

**Dependencies:**
- Kafka (message broker, Phase 2) / EventEmitter (MVP)
- SMTP service (email delivery)
- All modules (consumes events from all)

**APIs Exposed:**
- `GET /api/v1/notifications` — List user's notifications (paginated)
- `PATCH /api/v1/notifications/:id/read` — Mark as read

**Events Consumed (all modules):**
- `UserRegistered` → EMAIL_VERIFICATION
- `OfferSubmitted` → NEW_OFFER_RECEIVED (to customer)
- `OfferAccepted` → OFFER_ACCEPTED (to provider)
- `OfferRejected` → OFFER_REJECTED (to provider)
- `ContractCreated` → CONTRACT_READY (to both)
- `ContractActive` → CONTRACT_ACTIVE + CONTRACT_PDF_READY (to both)
- `PaymentCompleted` → PAYMENT_COMPLETED (to both)
- `ProviderPayoutCompleted` → PROVIDER_PAYOUT (to provider)
- `ProviderActivated` → PROVIDER_ACTIVATED (to provider)
- `ReviewSubmitted` → NEW_REVIEW_RECEIVED (to reviewee)

**Data Storage:**
- `notification.notifications` — Notification records with delivery status, retry count, timestamps
- `notification.processed_events` — Idempotency tracking (standard per-module pattern)

---

## 4. Interface & Data Contracts

### 4.1 Standard Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Demand created successfully",
  "code": "DEMAND_CREATED",
  "data": { },
  "meta": {
    "timestamp": "2026-03-03T14:30:00Z",
    "traceId": "abc-123-def-456",
    "locale": "de"
  },
  "errors": []
}
```

Paginated responses add to `meta`:
```json
{
  "meta": {
    "page": 1,
    "size": 20,
    "total": 142
  }
}
```

### 4.2 Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VAL_INVALID_INPUT",
  "data": null,
  "meta": {
    "timestamp": "2026-03-03T14:30:00Z",
    "traceId": "abc-123-def-456"
  },
  "errors": [
    {
      "field": "postCode",
      "message": "Invalid German postal code format",
      "code": "VAL_INVALID_PLZ"
    }
  ]
}
```

### 4.3 API Versioning

- **URL versioning:** `/api/v1/` for all MVP endpoints
- **Breaking changes:** Increment version (`/api/v2/`)
- **Deprecation:** 6-month notice before removing old versions

### 4.4 Standard Event Envelope

```typescript
interface DomainEvent {
  eventId: string;        // UUID — idempotency key
  type: string;           // e.g., "OfferAccepted"
  sourceModule: string;   // e.g., "offer"
  timestamp: Date;
  payload: unknown;       // Event-specific data
  metadata: {
    traceId: string;
    userId: string;
    version: number;      // Event schema version
  };
}
```

### 4.5 Localization in API Responses

Seed data entities (EstateType, FurnitureType, etc.) return localized names based on `Accept-Language` header:
- `Accept-Language: de` → `{ "name": "Wohnung" }`
- `Accept-Language: en` → `{ "name": "Apartment" }`
- Full localized object available via `?locale=all` → `{ "name": { "de": "Wohnung", "en": "Apartment" } }`

---

## 5. Security & Access Control

### 5.1 Keycloak Realm Configuration

**Single Realm: `cds`** — All user types in one realm with role-based separation.

| Role | Purpose | Assignment |
|------|---------|------------|
| `customer` | End users requesting moves | Auto on registration |
| `provider_owner` | Moving company owner | On provider registration (keeps customer role) |
| `provider_dispatcher` | Moving company dispatcher | Assigned by provider_owner |
| `provider_worker` | Moving company crew | Assigned by provider_owner |
| `admin` | Platform administrator | Manual assignment |
| `super_admin` | Full system access | Manual assignment |

**Rationale:** A single person can be both customer and provider (e.g., moving company owner relocating their own home). Multi-realm would require duplicate accounts and complicate GDPR erasure. See `docs/design/KeycloakRealmConfiguration.md` for full configuration details.

### 5.2 Permission Matrix

| Feature | Action | Customer | Prov. Owner | Prov. Dispatcher | Admin |
|---------|--------|----------|------------|-----------------|-------|
| **Demands** | Create | ✅ | ❌ | ❌ | ✅ |
| **Demands** | View Own | ✅ | ❌ | ❌ | ✅ |
| **Demands** | View Published (marketplace) | ❌ | ✅ | ✅ | ✅ |
| **Offers** | Submit | ❌ | ✅ | ✅ | ❌ |
| **Offers** | Accept/Reject | ✅ (own demand) | ❌ | ❌ | ❌ |
| **Offers** | View Own | ❌ | ✅ | ✅ | ✅ |
| **Contracts** | Accept | ✅ (own) | ✅ (own) | ❌ | ❌ |
| **Contracts** | View Own | ✅ | ✅ | ✅ | ✅ |
| **Contracts** | Cancel | ✅ (own) | ✅ (own) | ❌ | ✅ |
| **Payments** | Initiate | ✅ (own contract) | ❌ | ❌ | ❌ |
| **Payments** | View Transactions | ✅ (own) | ✅ (own) | ❌ | ✅ |
| **Providers** | Register | ❌ | ✅ | ❌ | ❌ |
| **Providers** | Manage Profile | ❌ | ✅ | ❌ | ✅ |
| **Providers** | Manage Employees | ❌ | ✅ | ❌ | ✅ |
| **Reviews** | Submit | ✅ (own contract) | ✅ (own contract) | ❌ | ❌ |
| **Reviews** | View | ✅ | ✅ | ✅ | ✅ |
| **Admin** | View All Data | ❌ | ❌ | ❌ | ✅ |
| **Admin** | Suspend Provider | ❌ | ❌ | ❌ | ✅ |
| **GDPR** | Data Export | ✅ (own) | ✅ (own) | ❌ | ❌ |
| **GDPR** | Account Deletion | ✅ (own) | ✅ (own) | ❌ | ✅ |

### 5.3 Data Access Policies

- **Row-Level Security:** Each module enforces that users can only access their own data
- **Provider data:** Owner sees all company data. Dispatcher sees operational data. Worker sees assigned jobs only.
- **Cross-module:** Modules access other modules' data only via service calls, never direct DB queries
- **PII:** Fields marked with `PII<T>` branded type in domain model. Masked in logs.

---

## 6. Observability Strategy

### 6.1 Structured Log Format

```json
{
  "timestamp": "2026-03-03T14:30:00.123Z",
  "level": "INFO",
  "service": "cds-platform",
  "module": "offer",
  "trace_id": "abc-123",
  "span_id": "xyz-789",
  "user_id": "usr_123",
  "message": "Offer submitted",
  "context": {
    "demand_id": "dem_456",
    "offer_id": "off_789",
    "amount_cents": 150000,
    "commission_rate": 0.04
  }
}
```

**PII Masking Rule:** Fields matching `email`, `phone`, `name`, `address`, `tax_number` patterns are automatically masked in logs: `"email": "l***@example.com"`.

### 6.2 Business Metrics

```yaml
metrics:
  cds_demands_created_total:
    type: counter
    labels: [service_type, locale]
  cds_offers_submitted_total:
    type: counter
    labels: [provider_region]
  cds_contracts_active_total:
    type: gauge
  cds_payments_completed_total:
    type: counter
    labels: [transaction_type]
  cds_commission_revenue_cents_total:
    type: counter
    description: "Total platform commission earned"
  cds_provider_activation_total:
    type: counter
  cds_average_offers_per_demand:
    type: gauge
  cds_demand_to_contract_conversion_rate:
    type: gauge
```

### 6.3 Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | 5xx > 5% of requests in 5min | Critical |
| Payment webhook failure | Stripe webhook returns non-200 for 3+ events | Critical |
| Offer response time | P95 > 500ms for 10min | Warning |
| Zero demands created | No new demands in 24 hours | Warning |
| Database connection pool | > 80% utilization | Warning |

---

## 7. Non-Functional Requirements

| Module | Target TPS | P95 Latency | Availability | RTO | RPO |
|--------|-----------|-------------|--------------|-----|-----|
| Auth | 100 | < 200ms | 99.9% | 15min | 0 (Keycloak) |
| Demand | 50 | < 300ms | 99.9% | 15min | 5min |
| Offer | 100 | < 200ms | 99.9% | 15min | 5min |
| Transport | 50 | < 200ms | 99.5% | 30min | 5min |
| Contract | 20 | < 500ms | 99.9% | 15min | 1min |
| Payment | 30 | < 1000ms | 99.95% | 5min | 0 |
| Review | 20 | < 200ms | 99.5% | 30min | 5min |
| Notification | 100 | < 5000ms (async) | 99.0% | 1h | 30min |

**Phase 2 NFR Addition (Kafka migration):**
- Add `cds_notification_consumer_lag` metric to monitor Kafka consumer group lag
- Add `cds_event_processing_latency_ms` histogram per module consumer
- Alerting: consumer lag > 1000 messages for 5min → Warning

**MVP Scale Targets:**
- 1,000 active demands/month
- 10,000 offers/month
- 500 completed transactions/month
- 50 active providers

---

## 8. Failure Modes & Recovery

### 8.1 Database Failure

**Scenario:** PostgreSQL primary instance fails.
**Detection:** Connection pool exhaustion, health check failures.
**Response:**
1. Circuit breaker opens for write operations
2. Read-only mode using replica (if available)
3. Queue incoming demands/offers for retry
**Recovery:** Restore from WAL backup (RPO: 5min). Promote replica.

### 8.2 Stripe Webhook Failure

**Scenario:** Stripe sends payment confirmation but webhook handler fails.
**Detection:** Missing `PaymentCompleted` events, Stripe dashboard shows delivered webhooks.
**Response:**
1. Stripe retries webhooks (up to 72 hours)
2. Idempotent handler prevents double processing
3. Manual reconciliation endpoint: `POST /api/v1/payments/reconcile`
**Recovery:** Re-fetch payment status from Stripe API. Update transaction status.

### 8.3 Keycloak Outage

**Scenario:** Keycloak unavailable.
**Detection:** JWT validation failures, login failures.
**Response:**
1. Existing JWTs continue to work until expiry (configurable, default 30min)
2. New logins impossible — show maintenance page
3. API calls with valid JWT still processed
**Recovery:** Restart Keycloak. User sessions preserved in Redis.

### 8.4 Email Service Failure

**Scenario:** SMTP service unavailable.
**Detection:** Kafka consumer retry count increasing.
**Response:**
1. Notifications queued in Kafka (retention: 7 days)
2. System continues normal operation — notifications are non-blocking
3. Backlog processed when SMTP recovers
**Recovery:** Automatic — Kafka consumer resumes.

---

## 9. Data Migration Strategy

### 9.1 Schema Migrations

**Tool:** Prisma Migrate
**Approach:** Forward-only migrations (no rollback scripts in Prisma). Test in staging first.
**Zero-downtime:** Additive changes only (new columns nullable, new tables). Destructive changes via multi-phase deployment.

### 9.2 Seed Data Migration Plan

| # | Source File | Target | Records | Strategy |
|---|-----------|--------|---------|----------|
| 1 | `Umzug/MainDocuments/Country.csv` | `shared.countries` | ~200 | CSV import script |
| 2 | `Umzug/MainDocuments/PostCodeData.csv` | `shared.post_codes` | ~8,200 | CSV import with geo-coordinates |
| 3 | `Umzug/backend/OAK/Documents/Estate.xlsx` Sheet 1 | `transport.estate_types` | 4 × 6 lang | XLSX parser → JSON → Prisma seed |
| 4 | Estate.xlsx Sheet 2 | `transport.estate_part_types` | 17 × 6 lang | XLSX parser → JSON → Prisma seed |
| 5 | Estate.xlsx Sheet 3 | `transport.furniture_types` | 227 × 6 lang | XLSX parser → JSON → Prisma seed |
| 6 | Estate.xlsx Sheet 4 | `transport.estate_type_part_type_map` | ~68 | XLSX parser → JSON → Prisma seed |

**Seed Script:** `prisma/seed.ts` — Runs on `prisma db seed`. Idempotent (upsert, not insert).
**Data Validation:** Verify all 227 furniture types have volume > 0, all localized names are non-empty for DE and EN.

### 9.3 i18n Seed Data

| Source | Target | Content |
|--------|--------|---------|
| `Umzug/backend/OAK/Documents/Report_de-DE.json` | Frontend i18n | 90+ UI translation keys (DE) |
| `Umzug/backend/OAK/Documents/Report_en-US.json` | Frontend i18n | 90+ UI translation keys (EN) |

---

## 10. Threat Modeling (STRIDE)

### Moving Platform Specific Threats

| Threat | Category | Risk | Mitigation |
|--------|----------|------|-----------|
| Fake provider registration | Spoofing | High | Document verification (Gewerbeschein), deposit requirement |
| Price manipulation (provider inflates then discounts) | Tampering | Medium | Price history tracking, statistical anomaly detection (Phase 2) |
| Customer denies receiving service | Repudiation | High | Mutual contract acceptance with timestamps, PDF record |
| Provider sees competitor pricing | Info Disclosure | Medium | Providers can only see their own offers, not other providers' |
| Mass fake demand creation | DoS | Medium | Rate limiting (APISIX), email verification required |
| Provider accesses other provider's data | Privilege Escalation | High | Schema isolation, RLS, Keycloak role enforcement |
| Deposit fraud (pay deposit, immediately withdraw) | Tampering | Medium | Deposit lock period, withdrawal requires admin approval |

### PCI-DSS Scope

**Approach:** SAQ A (minimal scope).
- No card data stored, processed, or transmitted by our system
- All card handling via Stripe hosted checkout page
- Only Stripe tokens and PaymentIntent IDs stored
- Annual SAQ A self-assessment sufficient

---

## 11. Compliance Requirements

### 11.1 GDPR Compliance

| Requirement | Implementation | Module |
|-------------|---------------|--------|
| **Right to Access** | `GET /api/v1/auth/data-export` — JSON export of all user data | auth (orchestrates) |
| **Right to Erasure** | `DELETE /api/v1/auth/account` — Cascading deletion across all schemas | auth (orchestrates) |
| **Right to Rectification** | Standard PATCH endpoints per module | all |
| **Consent Management** | `shared.consent_records` with timestamp + type + IP | auth |
| **Cookie Consent** | Frontend banner + backend consent record | auth + frontend |
| **Data Minimization** | `PII<T>` branded types enforce awareness. API DTOs return only necessary fields. | all |
| **Breach Notification** | Structured audit logging. 72-hour notification capability. | observability |
| **Data Portability** | JSON export in machine-readable format | auth |
| **DPO Contact** | Privacy policy page with contact info | frontend |

**PII Field Registry (from domain model `PII<T>` grep):**
- `UserReference`: email, displayName
- `ProviderCompany`: name, email, phoneNumber, taxNumber
- `ProviderDocument`: originalFilename
- `Address`: street, houseNumber
- `Contract`: customerUserId (resolvable to PII)

### 11.2 Erasure Cascade

Schema isolation enables per-module deletion:
```
DELETE request → auth module orchestrates:
  1. auth: delete user_references, consent_records
  2. demand: anonymize demands (keep for analytics, remove customerUserId)
  3. offer: anonymize offers
  4. provider: delete company, employees, documents
  5. contract: anonymize contracts (keep for legal retention, 10 years)
  6. payment: anonymize transactions (keep for tax records, 10 years)
  7. review: anonymize reviews (keep text, remove userId)
  8. Keycloak: delete user account
```

**Legal Retention Exception:** Tax-relevant records (invoices, payment transactions) must be retained for 10 years per German HGB §257. These are anonymized, not deleted.

---

## 12. Cost Estimation (MVP)

### 12.1 Infrastructure (Monthly)

| Resource | Specification | Cost/Month |
|----------|-------------|-----------|
| VPS/Cloud Server | 4 vCPU, 16GB RAM (Hetzner CCX23) | €35 |
| PostgreSQL | Managed or self-hosted on VPS | €0-20 |
| Redis | Self-hosted on VPS | €0 |
| Keycloak | Self-hosted on VPS | €0 |
| Domain + SSL | Let's Encrypt | €1 |
| Email (SMTP) | Mailgun/Postmark (free tier) | €0 |
| MinIO (S3) | Self-hosted on VPS | €0 |
| Stripe Fees | 1.4% + €0.25 per transaction (EU cards) | Variable |
| **Total Infrastructure** | | **~€56/month** |

**Note:** MVP uses single VPS with Docker Compose. Production scaling adds Kubernetes, managed DB, CDN — estimated €300-500/month at 500+ transactions/month.

### 12.2 Development Costs

| Activity | Estimate |
|----------|----------|
| MVP development (2 developers, 3 months) | In-house / open-source contribution |
| Stripe Connect setup + verification | 2-5 business days |
| Keycloak configuration | 1-2 days |
| Legal review (contract templates, privacy policy) | €1,000-3,000 (one-time) |
| Gewerbeanmeldung (business registration) | €20-60 |

---

## 13. Admin UI Architecture

### 13.1 Technology

- **Framework:** React + Refine (same as customer/provider frontend)
- **Auth:** Keycloak `cds` realm, `admin` / `super_admin` roles
- **Routing:** Separate `/admin` routes within same SPA

### 13.2 Admin Modules

| Module | Purpose |
|--------|---------|
| **Dashboard** | Active demands, offers, transactions. Revenue metrics. Provider health. |
| **Provider Management** | View/suspend/activate providers. Verify documents. |
| **Demand Management** | View all demands. Intervene in disputes (MVP: manual). |
| **Payment Overview** | Transaction list. Manual reconciliation trigger. Commission reports. |
| **User Management** | View users. GDPR erasure requests. Consent audit. |
| **Seed Data Management** | View/edit estate types, furniture types, room types (CRUD). |

---

## 14. Deployment Strategy

### 14.1 MVP Deployment

```
Docker Compose on single VPS:
├── cds-platform (NestJS app)
├── postgres (PostgreSQL 18.1)
├── redis (Redis 7)
├── keycloak (Keycloak 24)
├── kafka (KRaft mode, single broker)
├── minio (S3-compatible storage)
└── nginx (reverse proxy + static frontend)
```

### 14.2 CI/CD Pipeline

```
git push → GitHub Actions:
  1. Lint + Type check (tsc --noEmit)
  2. Unit tests (Jest)
  3. Integration tests (Testcontainers + PostgreSQL)
  4. Build Docker image
  5. Deploy to staging (auto)
  6. Deploy to production (manual approval)
```

### 14.3 Environment Strategy

| Environment | Purpose | Infrastructure |
|------------|---------|---------------|
| Local | Development | Docker Compose |
| Staging | Pre-production testing | Same as production VPS |
| Production | Live system | VPS with Docker Compose |

---

## 15. Success Criteria

- [ ] Customer can create a moving demand with room-by-room furniture selection
- [ ] Provider can register, pay deposit, and submit offers
- [ ] Customer can compare offers with transparent price breakdown
- [ ] Both parties can accept a digital contract (PDF generated)
- [ ] Real payment processed via Stripe (commission split works)
- [ ] Both parties can leave reviews after service completion
- [ ] Email notifications sent at key lifecycle points
- [ ] German and English UI fully functional
- [ ] GDPR consent + data export + erasure working
- [ ] Seed data loaded (227 furniture types, PLZ database)
- [ ] Platform earns 3-5% commission on real transactions

---

## 16. Review Checklist

- [x] All business requirements from brainstorming addressed (D-001 through D-017)
- [x] NFRs are specific and measurable (Section 7)
- [x] Security requirements defined with RBAC matrix (Section 5)
- [x] GDPR compliance documented with erasure cascade (Section 11)
- [x] PCI-DSS scope minimized (SAQ A via hosted checkout)
- [x] Cost estimation provided (Section 12)
- [x] Failure scenarios analyzed (Section 8)
- [x] Seed data migration strategy defined (Section 9)
- [x] No LLD-level details included (no code, no SQL DDL)
- [x] All module interfaces clearly defined (Section 3)
- [x] Dependencies mapped per module
- [x] Observability strategy complete (Section 6)
- [x] Domain model reference: `docs/domain-model/*.ts`
- [x] Threat modeling with moving-platform-specific risks (Section 10)

---

*This HLD was co-authored by Mimar (architecture) and Muhendis (domain model + implementation feasibility).*
*Domain model interfaces: `docs/domain-model/*.ts`*
*Decision log: `docs/team/decisions.md`*
*Last updated: 2026-03-03*
