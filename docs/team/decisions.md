# CDS Team Decisions

> Finalized decisions go here. Both Mimar and Muhendis must agree before writing.
> Format: Decision number, date, what was decided, reasoning.

---

## Prior Decisions (from brainstorming with Levent)

### D-001: No Heavy Blockchain
**Date:** 2026-03-02
**Decision:** No traditional blockchain infrastructure. Lightweight distributed verification possible later, but not MVP scope.
**Reasoning:** Blockchain adds complexity without solving the core problem. Trust comes from code transparency, deposits, and legal contracts.

### D-002: Economic Regulation via Deposits
**Date:** 2026-03-02
**Decision:** Use deposit/stake mechanism for trust and regulation instead of bureaucratic oversight.
**Reasoning:** Replaces 32,000-person trust departments (Uber model) with code-enforced economic incentives.

### D-003: Legally Valid Digital Contracts
**Date:** 2026-03-02
**Decision:** Service contracts must be legally valid and enforceable. Courts are the final arbiter for disputes.
**Reasoning:** Don't reinvent the legal system. Integrate with it.

### D-004: Profit Motive Required
**Date:** 2026-03-02
**Decision:** CDS is NOT non-profit. Low commission (3-5%) funds operations and provides rational economic incentive for all participants.
**Reasoning:** Non-profit models lack sustainability incentive. Profit drives rational behavior.

### D-005: Low Commission, High Volume
**Date:** 2026-03-02
**Decision:** Target 3-5% commission (vs Uber's 25%). Grow through volume, not margin.
**Reasoning:** Real cost of running a platform is ~3-5%. The rest of Uber's 25% is bureaucratic overhead and investor returns.

---

## Team Decisions

### D-006: MVP Sector — Moving Services (Nakliyat)
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** The first CDS vertical is a moving/relocation service platform.
**Reasoning:**
- Existing domain knowledge from Umzug codebase (12+ microservices, entity models, business flows)
- Concrete product that can reach real users in 2-3 months
- Proves all CDS differentiators: low commission, deposit mechanism, digital contracts
- Generalizing to other sectors comes after market validation
**Alternatives rejected:** Generic platform framework (too abstract), Light node engine first (infrastructure without product)

### D-007: Code Strategy — Domain Reuse, Clean Rewrite
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** Reference OAK domain models and business flows. Do NOT port .NET code.
**Reasoning:**
- Domain model is valuable: entity relationships, business flow (Demand → Offer → Accept), commission fields
- Code has quality issues: hardcoded statuses, no transaction management, over-engineered localization, custom auth
- Target stack is different (TypeScript vs .NET) — porting is slower than rewriting with domain reference
- Convert domain knowledge to TypeScript interfaces, discard all runtime code

### D-008: Architecture — Modular Monolith with Schema Isolation
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** Single deployable NestJS application. 9 domain modules, each with own PostgreSQL schema.
**Modules:** auth, provider, demand, offer, transport, contract, payment, review, notification
**Schema rules:**
- Each module owns its PostgreSQL schema; `shared` schema for common references
- No cross-schema JOINs — use in-process event bus or denormalize
- Enables microservice extraction later without rewriting
**Reasoning:** Module boundaries clear from OAK analysis. Schema isolation enforces boundaries at data level.

### D-009: Technology Stack
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:**
- Backend: NestJS (TypeScript) — module system maps 1:1 to domain modules
- Frontend: React + TypeScript + Refine
- Database: PostgreSQL 18.1+ (multi-schema)
- ORM: Prisma with multi-file schema (one .prisma file per module)
- Auth: Keycloak (OAuth2/OIDC)
- Cache: Redis | Queue: Kafka (KRaft) | Gateway: APISIX
- Observability: Prometheus + Grafana + Loki + OpenTelemetry → Jaeger

### D-010: MVP Feature Scope
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision — In MVP:**
1. User registration + auth (Keycloak, provider/customer roles)
2. Provider onboarding (profile + deposit → activation)
3. Demand creation (customer creates moving request)
4. Offer submission (providers bid on demands)
5. Offer acceptance + simplified contract (mutual click-accept → PDF)
6. Deposit/stake mechanism (provider registration deposit)
7. Job completion + payment (3-5% commission)
8. Bidirectional reviews/ratings
9. Email notifications (event-driven, Kafka → email)

**Deferred to Phase 2:** Light node network, AI matching, multi-sector, dispute engine, legal e-signatures, push/SMS/in-app notifications

### D-011: Shared Schema — Minimal Scope
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** The `shared` PostgreSQL schema contains ONLY:
- `user_references` table (user_id UUID PK, email, display_name) — updated by auth module via events
- Enum types (demand_status, offer_status, contract_status, etc.)
- Lookup tables (country, currency, region) — static reference data

**Explicit exclusions:** No business logic tables, no module "main" entities, no join tables.
**Cross-schema FK:** NOT allowed. Modules store UUID references only. If a module needs user info, it calls auth service (in-process) or denormalizes via event listener.
**Adding to shared schema:** Requires explicit agreement from both Mimar and Muhendis.
**Reasoning:** Prevents shared schema from becoming a coupling point. OAK codebase suffered from exactly this — everything referenced everything, impossible to decouple.

### D-012: Payment Strategy — RESOLVED
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis + Levent
**Decision:** Real payment integration via **Stripe Connect Europe** with hosted checkout.
- Currency: EUR
- Hosted Checkout with SCA (PSD2 compliant) — no card data touches our system (SAQ A)
- Commission split via Stripe Connect "destination charges" (platform 3-5%, rest to provider)
- Provider deposit: real EUR via Stripe SetupIntent + delayed charge
- `PaymentGateway` interface with adapter pattern — Stripe implementation for MVP
**Reasoning:** Levent confirmed European market. Stripe Connect covers 35+ European countries, handles SCA/PSD2, and provides built-in marketplace commission splitting.

### D-013: Target Market — Europe, Starting with Germany
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis + Levent (unanimous)
**Decision:**
- Target market: Europe
- First country: Germany (existing domain knowledge from Umzug codebase)
- Expansion path: Germany → DACH (Austria, Switzerland) → broader EU
- UI languages (MVP): German + English
- Currency (MVP): EUR
- GDPR compliance required from day one
**GDPR architectural impact:**
- Data minimization in all modules
- Right to erasure: schema isolation enables per-module deletion
- Consent management in auth module
- Data portability: user data export endpoint (JSON)
- Audit logging for breach notification readiness
**Reasoning:** "Umzug" codebase was built for German moving market — domain knowledge (address formats, vehicle types, moving workflows) directly applicable. Germany is Europe's largest moving market.

### D-014: Domain Glossary — DE↔EN Terminology
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** Maintain a formal domain glossary mapping English code terms to German market terms. Stored at `docs/domain-model/GLOSSARY.md`.
**Key mappings:**

| EN (Code) | DE (Market/User) | Description |
|-----------|-----------------|-------------|
| Estate | Wohnung/Immobilie | Property being moved from/to |
| Cellar | Keller | Basement/storage |
| Loft | Dachboden | Attic |
| Furniture Montage | Möbelmontage | Furniture assembly |
| Kitchen Montage | Küchenmontage | Kitchen assembly |
| Packing Service | Verpackungsservice | Packing service |
| Walking Way | Trageweg | Carrying distance |
| Moving Goods | Umzugsgut | Items being moved |
| Provider | Umzugsunternehmen | Moving company |
| Demand | Umzugsanfrage | Moving request |

**Reasoning:** DDD "Ubiquitous Language" principle. Ensures developers, domain experts, and i18n keys all use consistent terminology. Source: OAK codebase analysis confirmed German domain terms embedded in code.

### D-015: GDPR — PII Branded Type Pattern
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** Use TypeScript branded types (`PII<T>`, `Sensitive<T>`) to mark personally identifiable and sensitive data fields at the type level. Zero runtime overhead, enables grep-based PII discovery, data minimization audits, and future erasure logic.
**Enforcement:** Code review in MVP. Runtime PII masking deferred to Phase 2.
**Reasoning:** GDPR requires knowing where personal data lives. Branded types make this discoverable at compile time without runtime cost.

### D-016: Seed Data Strategy — Comprehensive Domain Data Migration
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** Migrate reference/lookup data from OAK sources. No business data (users, demands).

**Migration plan (ordered):**

| # | Source | Target Schema.Table | Content |
|---|--------|-------------------|---------|
| 1 | Country.csv | shared.countries | 200+ countries (ISO code, locale, phone code) |
| 2 | PostCodeData.csv | shared.post_codes | German PLZ + geo-coordinates (~8,200 entries) |
| 3 | Estate.xlsx Sheet 1 | transport.estate_types | 4 estate types × 6 languages |
| 4 | Estate.xlsx Sheet 2 | transport.estate_part_types | 17 room types × 6 languages + IsOuter flag |
| 5 | Estate.xlsx Sheet 3 | transport.furniture_types | 227 furniture items × 6 languages + volume (m³) + montage/demontage cost |
| 6 | Estate.xlsx Sheet 4 | transport.estate_type_part_map | Matrix: which room types belong to which estate type |

**Not migrated:** Preisliste.xls (price reference only, real prices come from provider offers), OAK.backup business data, geodata (Phase 2).
**Reasoning:** Estate.xlsx alone contains months of domain expert knowledge (227 furniture types with volumes and costs in 6 languages). PostCodeData enables address validation and distance calculation. Recreating this manually would be wasteful.

### D-017: Cookie Consent — MVP Requirement
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (unanimous)
**Decision:** MVP includes a cookie consent banner (ePrivacy Directive + GDPR requirement for European market). Frontend: simple consent banner component using existing DE/EN translations from Report_de-DE.json. Backend: consent_records in auth module (timestamp, consent type, IP). Not a separate module.
**Reasoning:** Legal obligation in EU. Existing OAK translations (cookie.header, cookie.message, cookie.allow, cookie.deny) provide ready-made DE content.

### D-018: Notification Module — Persistent Schema
**Date:** 2026-03-03
**Decided by:** Mimar + Muhendis (cross-review)
**Decision:** Notification module gets its own `notification` PostgreSQL schema with persistent notification records. Not stateless.
- `notification.notifications` table: delivery status, retry count, channel, timestamps
- `notification.processed_events` table: idempotency tracking (standard pattern)
- Total DB schemas: 9 (was 8 — shared, demand, offer, transport, provider, contract, payment, review, notification)
**Reasoning:** Muhendis correctly identified that retry logic requires persistent delivery status tracking. notification.ts domain model already defines a full persistent entity with BaseEntity.

### D-019: Deposit Endpoint — Belongs to Payment Module
**Date:** 2026-03-03
**Decided by:** Mimar (cross-review)
**Decision:** Provider deposit initiation endpoint (`POST /api/v1/payments/deposits`) belongs to the payment module, not the provider module. Provider module references it.
**Reasoning:** Deposit is a Stripe payment transaction — payment logic (checkout session creation, webhook handling, transaction tracking) is payment module's responsibility. Provider module triggers the flow but doesn't own the implementation.

### D-020: Implementation Phase — First Module: Transport
**Date:** 2026-03-04
**Decided by:** Mimar (approved by Levent)
**Decision:** Implementation starts with Transport module as the first target.
- NestJS scaffolding (no `nest new` — manual setup in existing repo)
- Docker Compose: PostgreSQL + Redis first, Keycloak/Kafka/MinIO later
- Prisma migrate to create all 9 schemas
- Common infrastructure: ApiResponse wrapper, GlobalExceptionFilter, JWT guard (stub)
- Transport module: 6 public endpoints (estate types, furniture types, PLZ lookup, volume estimate)
- Seed script: Estate.xlsx + Country.csv + PostCodeData.csv → DB
**Reasoning:** Transport is the most independent module (no Keycloak, no Stripe, all public endpoints). Validates entire Prisma multi-schema setup, localization pattern, and seed data pipeline end-to-end.

### D-021: PostgreSQL Version — 17 (not 18.1)
**Date:** 2026-03-04
**Decided by:** Mimar
**Decision:** Use PostgreSQL 17 for MVP instead of 18.1 (listed in HLD). PostgreSQL 18 is not yet stable/GA. Switch to 18 when it reaches stable release.
**Reasoning:** Production stability over bleeding edge. All required features (multi-schema, UUID, JSON, array types) available in PG17.

### D-022: Keycloak — Single Realm (HLD Revision)
**Date:** 2026-03-04
**Decided by:** Mimar + Levent
**Decision:** Use a single Keycloak realm (`cds`) instead of 3 realms (cds-customers, cds-providers, cds-admin). All user types share one realm with role-based separation.
**HLD impact:** Section 2.2 and Section 5.1 updated. No impact on permission matrix, API contracts, or Prisma schemas.
**Reasoning:** A person can be both customer and provider (moving company owner relocating their own home). Multi-realm requires duplicate accounts, duplicate logins, and complicates GDPR erasure. Single realm with composite roles (customer, provider_owner, provider_dispatcher, provider_worker, admin, super_admin) provides equivalent security via NestJS guards + Prisma schema isolation.
