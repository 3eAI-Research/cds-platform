# High-Level Design: AI Moving Assistant & Project Planner

**Version:** 1.0.0
**Status:** Draft
**Input:** VISION.md, USER_STORIES.md, SRS.md, BUSINESS_LOGIC.md

---

## 1. System Scope & Goals

**Business Problem:** Customers must fill a complex 4-step form (20+ fields) to create a moving request, with no cost visibility before receiving offers. This leads to drop-offs and poor demand quality.

**Solution:** A conversational AI agent that collects moving data through natural chat, detects furniture from photos, calculates a project plan (route, crew, man-hours), and generates a professional report — monetized via a credit system.

**Key Capabilities:**
1. Natural language chat for demand creation (Mistral AI)
2. Photo-based furniture detection (Mistral Vision)
3. Moving project plan calculation (volume, route, crew, EU regulations)
4. PDF report generation
5. Credit pack purchase and management (Stripe)

**Out of Scope:**
- Real-time provider matching
- Payment escrow between customer and provider
- Voice input
- Mobile app (Android/iOS) — future phase

**Success Metrics:**
- Demand creation time: < 5 min (vs ~8 min form)
- Photo detection accuracy: > 80% for common furniture
- Cost estimate accuracy: ±20% vs actual offers
- Credit purchase conversion: > 15% of chat users

---

## 2. Platform Architecture

**Auth:** Keycloak (existing — X-User-Role header for MVP, JWT for production)
**Gateway:** APISIX (existing routes at port 3333)
**UI:** React 18 + TypeScript + Refine + Ant Design (existing)
**Observability:** Structured JSON logging (Loki-ready), Prometheus metrics
**Database:** PostgreSQL (existing cds-postgres) + Redis (existing cds-redis)
**AI:** Mistral AI API (EU-based, chat + vision models)
**Maps:** Google Maps Directions API
**Payments:** Stripe Checkout + Webhooks

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                                                                 │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Chat UI  │  │ Photo      │  │ Credit   │  │ Existing     │ │
│  │ Component│  │ Upload     │  │ Balance  │  │ Pages        │ │
│  └────┬─────┘  └─────┬──────┘  └────┬─────┘  └──────────────┘ │
└───────┼──────────────┼──────────────┼──────────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Backend (port 3333)                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NEW MODULES                           │   │
│  │                                                         │   │
│  │  AgentModule              CreditModule   PaymentModule  │   │
│  │  ├ AgentController        ├ CreditCtrl   ├ StripeCtrl   │   │
│  │  ├ AgentService           ├ CreditSvc    ├ StripeSvc    │   │
│  │  ├ MistralService         ├ LedgerSvc    ├ WebhookSvc   │   │
│  │  ├ PhotoAnalyzerService   │              │              │   │
│  │  ├ PlanCalculatorService  │              │              │   │
│  │  │  ├ RouteService        │              │              │   │
│  │  │  ├ CrewCalculator      │              │              │   │
│  │  │  ├ VehicleCalculator   │              │              │   │
│  │  │  └ RegulationService   │              │              │   │
│  │  └ ReportService (PDF)    │              │              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  EXISTING MODULES (unchanged)            │   │
│  │  DemandModule, TransportModule, OfferModule,            │   │
│  │  ContractModule, ProviderModule, PaymentModule(legacy)  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────┬──────────────┬──────────────┬────────────────────────┘
          │              │              │
    ┌─────┴─────┐  ┌─────┴─────┐  ┌────┴────┐
    │ PostgreSQL│  │   Redis   │  │ External│
    │ (existing)│  │ (existing)│  │  APIs   │
    │           │  │           │  │         │
    │ + agent   │  │ + chat    │  │ Mistral │
    │   schema  │  │   sessions│  │ Google  │
    │ + credit  │  │           │  │ Stripe  │
    │   schema  │  │           │  │         │
    └───────────┘  └───────────┘  └─────────┘
```

---

## 3. Module Decomposition

### 3.1. Agent Module (`agent`)

**Tech Stack:** NestJS, Mistral AI SDK, Redis (session state)
**Primary Responsibility:** Manage conversational AI sessions for demand creation, including photo analysis and data extraction.

**Key Features:**
1. Chat session management (create, message, close)
2. Mistral AI integration with tool-calling for structured extraction
3. Photo upload and furniture detection via Mistral Vision
4. Session state management in Redis (30-min TTL)
5. Summary card generation and demand creation

**Dependencies:**
- `DemandService` (existing): Create demand from extracted data
- `VolumeCalculatorService` (existing): Calculate furniture volume
- `CreditService` (new): Check/deduct credits for photo analysis
- `PlanCalculatorService` (new): Generate project plan
- `ReportService` (new): Generate PDF report

**APIs Exposed:**
- `POST /api/v1/agent/sessions` — Create new chat session
- `POST /api/v1/agent/sessions/:id/messages` — Send message (text)
- `POST /api/v1/agent/sessions/:id/photos` — Upload photos for analysis
- `POST /api/v1/agent/sessions/:id/confirm` — Confirm and create demand
- `GET /api/v1/agent/sessions/:id` — Get session state and history
- `DELETE /api/v1/agent/sessions/:id` — Cancel/discard session

**Events Published:**
- `agent.session.created` — New chat session started
- `agent.session.completed` — Demand created via agent
- `agent.photo.analyzed` — Photo analysis completed

**Data Storage:**
- **Redis:** Active session state (conversation history, extracted data)
- **PostgreSQL:** Session audit log (agent schema)

### 3.2. Plan Calculator Module (part of Agent Module)

**Tech Stack:** NestJS, Google Maps API client, calculation logic
**Primary Responsibility:** Calculate complete moving project plan from collected data.

**Key Features:**
1. Route calculation via Google Maps Directions API
2. Crew size calculation from volume and building data
3. Vehicle type selection from total volume
4. EU driving regulation compliance (EC 561/2006)
5. Man-hour breakdown generation
6. PDF report generation

**Dependencies:**
- `VolumeCalculatorService` (existing): Furniture volume
- Google Maps Directions API (external)
- PLZ database (existing, 8305 entries with lat/lng): Haversine fallback

**APIs Exposed:**
- `POST /api/v1/agent/sessions/:id/plan` — Calculate project plan
- `POST /api/v1/agent/sessions/:id/report` — Generate PDF report
- `GET /api/v1/reports/:id/download` — Download PDF (authenticated, time-limited)

### 3.3. Credit Module (`credit`)

**Tech Stack:** NestJS, PostgreSQL (credit schema)
**Primary Responsibility:** Manage user credit balance and transaction ledger.

**Key Features:**
1. Credit balance management per user
2. Atomic credit deduction (check + deduct in transaction)
3. Immutable credit ledger (append-only)
4. Balance query

**Dependencies:**
- None (standalone module, consumed by others)

**APIs Exposed:**
- `GET /api/v1/credits/balance` — Get current balance
- `GET /api/v1/credits/transactions` — Get transaction history (paginated)

**Events Published:**
- `credit.purchased` — Credits added to account
- `credit.spent` — Credits deducted
- `credit.refunded` — Credits returned

**Data Storage:**
- **PostgreSQL:** `credit.credits` (balance), `credit.credit_ledger` (transactions)

### 3.4. Payment Module — Stripe (`stripe-payment`)

**Tech Stack:** NestJS, Stripe SDK
**Primary Responsibility:** Handle credit pack purchases via Stripe Checkout.

**Key Features:**
1. Create Stripe Checkout sessions for credit packs
2. Handle Stripe webhooks (payment confirmation)
3. Idempotent webhook processing

**Dependencies:**
- `CreditService`: Add credits on successful payment
- Stripe API (external)

**APIs Exposed:**
- `POST /api/v1/payments/checkout` — Create Stripe Checkout session
- `POST /api/v1/payments/webhook` — Stripe webhook handler (no auth, signature verified)
- `GET /api/v1/payments/packs` — List available credit packs

**Data Storage:**
- **PostgreSQL:** `credit.payment_transactions` (Stripe session mapping)

---

## 4. Interface & Data Contracts

### 4.1 Standard Response Format (existing)
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "...", "traceId": "...", "page": 1, "size": 20, "total": 100 }
}
```

### 4.2 Chat Message Contract
```
POST /api/v1/agent/sessions/:id/messages
Request:  { "content": "string (max 2000 chars)" }
Response: {
  "success": true,
  "data": {
    "sessionId": "uuid",
    "messages": [
      { "role": "user", "content": "...", "timestamp": "..." },
      { "role": "assistant", "content": "...", "timestamp": "..." }
    ],
    "extractedData": {
      "from": { "address": {...}, "estate": {...} } | null,
      "to": { "address": {...}, "estate": {...} } | null,
      "dates": { "start": "...", "end": "..." } | null,
      "furniture": [ { "furnitureTypeId": "...", "quantity": N } ] | null,
      "services": { ... } | null
    },
    "state": "COLLECTING | SUMMARY | SUBMITTED",
    "completionPercentage": 0-100
  }
}
```

### 4.3 Photo Analysis Contract
```
POST /api/v1/agent/sessions/:id/photos
Request:  multipart/form-data (photos: File[], max 10 files, max 10MB each)
Response: {
  "success": true,
  "data": {
    "detectedItems": [
      {
        "furnitureTypeId": "uuid" | null,
        "name": "Doppelbett",
        "confidence": 0.92,
        "quantity": 1,
        "matched": true
      }
    ],
    "creditDeducted": 1,
    "remainingBalance": 4
  }
}
```

### 4.4 Project Plan Contract
```
POST /api/v1/agent/sessions/:id/plan
Response: {
  "success": true,
  "data": {
    "route": {
      "distanceKm": 285,
      "durationHours": 3.2,
      "waypoints": [...],
      "source": "google_maps | haversine_fallback"
    },
    "vehicle": {
      "type": "LKW 3.5t",
      "count": 1,
      "maxLoadM3": 25
    },
    "crew": {
      "workers": 3,
      "drivers": 1
    },
    "timeline": {
      "segments": [
        { "type": "LOADING", "durationHours": 2.5, "manHours": 7.5 },
        { "type": "DRIVING", "durationHours": 3.2, "breakMinutes": 0 },
        { "type": "UNLOADING", "durationHours": 2.0, "manHours": 6.0 },
        { "type": "ASSEMBLY", "durationHours": 1.5, "manHours": 1.5 }
      ],
      "totalDurationHours": 9.2,
      "totalManHours": 18.2,
      "multiDay": false
    },
    "volume": {
      "totalM3": 18.5,
      "itemCount": 42
    },
    "toleranceBand": "±20%"
  }
}
```

### 4.5 Credit Contract
```
GET /api/v1/credits/balance
Response: { "success": true, "data": { "balance": 15, "userId": "uuid" } }

POST /api/v1/payments/checkout
Request:  { "packId": "starter | standard | pro" }
Response: { "success": true, "data": { "checkoutUrl": "https://checkout.stripe.com/..." } }
```

### 4.6 Error Codes (additions to existing taxonomy)

| Code | HTTP | Description |
|------|------|-------------|
| BUS_INSUFFICIENT_CREDITS | 402 | Not enough credits |
| BUS_SESSION_EXPIRED | 410 | Chat session timed out |
| BUS_SESSION_NOT_FOUND | 404 | Invalid session ID |
| BUS_PHOTO_TOO_LARGE | 413 | Photo > 10 MB |
| BUS_PHOTO_INVALID_TYPE | 415 | Not JPEG/PNG/WebP |
| BUS_ADDRESS_NOT_FOUND | 422 | Cannot parse address |
| BUS_FIELDS_INCOMPLETE | 422 | Required fields missing |
| BUS_ROUTE_UNAVAILABLE | 503 | Route calculation failed |
| BUS_AI_UNAVAILABLE | 503 | Mistral API down |

---

## 5. Security & Access Control

### 5.1 Permission Matrix

| Feature | Action | Customer | Provider | Admin |
|---------|--------|----------|----------|-------|
| Agent Chat | Create session | Yes | No | No |
| Agent Chat | Send message | Yes (own) | No | No |
| Agent Chat | Upload photo | Yes (own) | No | No |
| Agent Chat | Confirm demand | Yes (own) | No | No |
| Credits | View balance | Yes (own) | Yes (own) | Yes (all) |
| Credits | Purchase | Yes | Yes | No |
| Credits | View transactions | Yes (own) | Yes (own) | Yes (all) |
| Reports | Download | Yes (own) | No | Yes (all) |
| Payments | Webhook | N/A (Stripe) | N/A | N/A |

### 5.2 Data Protection

- **API Keys:** Mistral, Google Maps, Stripe — server-side only, environment variables
- **Photos:** Encrypted at rest, auto-deleted within 1 hour
- **Chat History:** Encrypted at rest, 30-day retention, GDPR-deletable
- **Credit Ledger:** Immutable, 7-year retention (financial records)
- **Stripe:** No card data stored — Stripe Checkout handles PCI compliance

### 5.3 Input Validation

- Photo upload: Size ≤ 10 MB, type in [JPEG, PNG, WebP], dimensions ≥ 200×200
- Chat message: Length 1-2000 chars, rate limit 20/min per user
- Credit pack: Must be valid pack ID (starter/standard/pro)
- All IDs: UUID format validation

---

## 6. Observability Strategy

### 6.1 Logging

All new modules use structured JSON logging with:
- `trace_id`, `user_id`, `session_id`
- AI interactions logged: model, token count, latency (NO prompt content in production)
- Credit operations logged: action, amount, balance_after
- Photo operations logged: file count, total size, detected items count (NO image data)

### 6.2 Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `agent_sessions_total` | counter | status | Chat sessions created |
| `agent_messages_total` | counter | role | Messages sent (user/assistant) |
| `agent_photo_analyses_total` | counter | result | Photo analyses performed |
| `agent_demands_created_total` | counter | — | Demands created via agent |
| `mistral_api_duration_seconds` | histogram | model, endpoint | Mistral API latency |
| `mistral_api_errors_total` | counter | error_type | Mistral API errors |
| `googlemaps_api_duration_seconds` | histogram | — | Google Maps API latency |
| `credit_balance` | gauge | — | Aggregate credit balances |
| `credit_purchases_total` | counter | pack | Credit pack purchases |
| `credit_spent_total` | counter | action | Credits spent by action type |
| `stripe_webhooks_total` | counter | event, status | Webhook events processed |

### 6.3 Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| Mistral API down | Error rate > 50% for 5 min | Critical |
| High Mistral latency | P95 > 10s for 5 min | Warning |
| Credit balance negative | Any user balance < 0 | Critical |
| Stripe webhook failures | Failure rate > 10% for 5 min | Critical |
| Photo cleanup overdue | Photos older than 2 hours exist | Warning |

---

## 7. Non-Functional Requirements

| Module | P95 Latency | Availability | Concurrent | RTO | RPO |
|--------|-------------|--------------|------------|-----|-----|
| Agent Chat (message) | 3s | 99.5% | 100 sessions | 15 min | 5 min |
| Photo Analysis | 10s | 99.0% | 20 concurrent | 15 min | N/A |
| Plan Calculator | 5s | 99.5% | 50 concurrent | 15 min | N/A |
| Credit Operations | 200ms | 99.9% | 500 req/s | 5 min | 0 (transactional) |
| Stripe Checkout | 2s | 99.9% (Stripe SLA) | 100 concurrent | N/A | N/A |
| PDF Generation | 15s | 99.0% | 10 concurrent | 30 min | N/A |

---

## 8. Failure Modes & Recovery

### 8.1 Mistral API Failure
**Detection:** Error rate > 50%, timeout > 30s
**Automatic Response:**
1. Retry with exponential backoff (3 attempts)
2. If persistent: return graceful degradation message to user
3. Session state preserved in Redis — user can resume when API recovers
**Manual Recovery:** Check Mistral status page, verify API key, check rate limits

### 8.2 Google Maps API Failure
**Detection:** Non-200 response, timeout > 10s
**Automatic Response:**
1. Fallback to Haversine distance from PLZ lat/lng table (8305 entries)
2. Flag in response: `source: "haversine_fallback"`
3. Route estimation ±15% less accurate but functional
**Manual Recovery:** Check API key billing, quota, restrictions

### 8.3 Stripe Webhook Failure
**Detection:** Webhook endpoint returns non-200, Stripe retry
**Automatic Response:**
1. Stripe retries automatically (up to 3 days)
2. Idempotency key prevents double-processing
3. Credits NOT added until webhook confirms
**Manual Recovery:** Check Stripe dashboard, manually reconcile if needed

### 8.4 Redis Failure (Session Loss)
**Detection:** Redis connection error
**Automatic Response:**
1. Active sessions lost — user sees "session expired"
2. No data loss (demands are in PostgreSQL)
3. User can start new session
**Impact:** Active chat sessions interrupted, no financial impact

### 8.5 Photo Cleanup Failure
**Detection:** Alert when photos > 2 hours old exist
**Automatic Response:** Cron job retries every 15 minutes
**Manual Recovery:** Run cleanup script manually, check file permissions

---

## 9. Data Migration Strategy

### 9.1 New Database Schemas

**Schema: `agent`**
- `agent_sessions` — Chat session metadata
- `agent_messages` — Message history (for audit, not for session state)
- `agent_reports` — Generated PDF report references

**Schema: `credit`**
- `credits` — User credit balance
- `credit_ledger` — Immutable transaction log
- `credit_packs` — Available pack definitions
- `payment_transactions` — Stripe checkout session mapping

### 9.2 Migration Approach
- Prisma migrations (existing tooling)
- New schemas, no changes to existing tables
- `estimatedDistanceKm` in transportation table already exists (currently 0) — no migration needed
- Zero downtime: additive changes only

---

## 10. Threat Modeling (STRIDE)

| Threat | Target | Risk | Mitigation |
|--------|--------|------|------------|
| **Spoofing** | Agent API | Attacker creates sessions as other user | Auth middleware, user ID from JWT/header |
| **Tampering** | Chat messages | Injecting prompt to manipulate AI | System prompt hardcoded server-side, user input sanitized |
| **Tampering** | Credit balance | Manipulating balance via API | Atomic transactions, server-side only, no client trust |
| **Tampering** | Stripe webhook | Fake webhook to add credits | Stripe signature verification (webhook secret) |
| **Repudiation** | Credit purchases | User denies purchase | Immutable ledger, Stripe receipt |
| **Info Disclosure** | Photos | Uploaded photos leaked | Encrypted storage, 1-hour auto-delete, no public URLs |
| **Info Disclosure** | Chat history | PII in conversations | 30-day retention, GDPR deletion, encrypted at rest |
| **Info Disclosure** | API keys | Mistral/Google/Stripe keys exposed | Server-side only, K8s secrets, never in logs |
| **DoS** | Agent API | Flood with chat messages | Rate limit: 20 msg/min per user, 1 session per user |
| **DoS** | Photo upload | Flood with large files | 10 MB limit, 10 files/batch, rate limit |
| **DoS** | Mistral API | Exhaust rate limit | Request queue, per-user rate limit |
| **EoP** | Credit system | User gains credits without payment | Credits only via verified Stripe webhook |

**Prompt Injection Mitigation:**
- System prompt is server-side, never exposed to client
- User input passed as `user` role messages only
- Tool-calling results validated against schema before use
- Extracted data validated against existing DTOs (CreateDemandDto)

---

## 11. Compliance Requirements

### 11.1 GDPR
- **Chat data:** 30-day retention, deletable on request
- **Photos:** 1-hour max retention, auto-deleted
- **Credit ledger:** 7-year retention (financial legal requirement — excluded from right to deletion)
- **DPA required:** Mistral AI (data processor), Google (data processor)

### 11.2 PSD2 (Payment Services Directive)
- Stripe Checkout handles SCA (Strong Customer Authentication)
- No card data touches our servers
- Stripe is EU-licensed payment processor

### 11.3 EU Driving Regulations
- EC 561/2006 compliance in all plan calculations
- Calculator enforces 4.5h driving + 45min break, 9h daily max

---

## 12. Cost Estimation

### 12.1 API Costs (per 1000 users/month)

| Service | Usage Estimate | Unit Cost | Monthly Cost |
|---------|---------------|-----------|-------------|
| Mistral Large (chat) | 5000 sessions × 10 msgs × 2K tokens | ~$0.003/1K tokens | ~$300 |
| Mistral Vision (photos) | 1000 analyses × 5 photos × 1K tokens | ~$0.005/1K tokens | ~$25 |
| Google Maps Directions | 3000 route calculations | $5/1000 requests | ~$15 |
| Stripe | 500 credit purchases | 1.5% + 0.25€ | ~$12 |
| **Total API costs** | | | **~$352/month** |

### 12.2 Infrastructure (incremental to existing)
- Redis memory: +50 MB for sessions → negligible on existing instance
- PostgreSQL: +2 new schemas → negligible on existing instance
- File storage for photos: ~5 GB temp → local disk
- PDF storage: ~1 GB/month → local disk or MinIO

### 12.3 Revenue Projection (per 1000 users)
- 15% conversion → 150 purchases
- Average pack: Standard (15€)
- Revenue: 150 × 15€ = **2,250€/month**
- API cost: ~352€ → **margin: ~84%**

---

## 13. Admin UI Architecture

Admin can view:
- **Agent sessions:** List all sessions, view chat history (read-only)
- **Credit overview:** All user balances, transaction ledger
- **Payment history:** Stripe payment records
- **Photo analysis stats:** Detection accuracy, usage stats
- **Report downloads:** All generated reports

Using existing admin role in Refine framework. New pages added to admin sidebar.

---

## 14. Review Checklist

- [x] All 11 user stories addressed
- [x] NFRs specific and measurable
- [x] Security requirements defined (STRIDE)
- [x] Compliance documented (GDPR, PSD2, EC 561/2006)
- [x] Cost estimation provided with revenue projection
- [x] Failure scenarios analyzed (5 scenarios)
- [x] Migration strategy defined (additive, zero-downtime)
- [x] No LLD-level details (no code, no SQL, no annotations)
- [x] All interfaces clearly defined (5 API contracts)
- [x] Dependencies mapped (3 external APIs, 5 internal modules)
- [x] Observability complete (logging, 12 metrics, 5 alerts)
- [x] Prompt injection mitigation documented
