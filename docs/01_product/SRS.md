# System Requirements Specification (SRS): AI Moving Assistant

## 1. Functional Requirements

### 1.1 Agent Chat System
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | System SHALL provide a chat endpoint that maintains conversation state | Must |
| FR-02 | System SHALL use Mistral AI API for natural language understanding | Must |
| FR-03 | System SHALL parse free-text into structured CreateDemandDto fields | Must |
| FR-04 | System SHALL support tool-calling for structured data extraction | Must |
| FR-05 | System SHALL support photo upload and analysis via Mistral Vision | Must |
| FR-06 | System SHALL match detected furniture to FurnitureType catalog | Must |
| FR-07 | System SHALL generate summary card after all fields collected | Must |
| FR-08 | System SHALL create demand via existing service on user confirmation | Must |

### 1.2 Project Plan Calculator
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10 | System SHALL calculate route via Google Maps Directions API | Must |
| FR-11 | System SHALL estimate crew size from volume and floor data | Must |
| FR-12 | System SHALL determine vehicle type from total volume | Must |
| FR-13 | System SHALL apply EU driving regulations (EC 561/2006) | Must |
| FR-14 | System SHALL produce man-hour breakdown (not EUR pricing) | Must |
| FR-15 | System SHALL generate PDF report with plan details | Should |
| FR-16 | System SHALL use existing VolumeCalculatorService for volume | Must |
| FR-17 | System SHALL populate estimatedDistanceKm (currently 0) | Must |

### 1.3 Credit System
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | System SHALL support credit pack purchase via Stripe Checkout | Must |
| FR-21 | System SHALL deduct credits atomically before premium actions | Must |
| FR-22 | System SHALL maintain an immutable credit ledger | Must |
| FR-23 | System SHALL display balance in UI header | Must |
| FR-24 | System SHALL provide transaction history | Must |

## 2. Non-Functional Requirements

| Category | Requirement | Target | Measurement |
|----------|-------------|--------|-------------|
| **Performance** | Agent chat response time | < 3s (P95) | APM monitoring |
| **Performance** | Photo analysis time | < 10s per photo | APM monitoring |
| **Performance** | Route calculation | < 2s | Google Maps API latency |
| **Availability** | Agent service uptime | 99.5% | Health checks |
| **Scalability** | Concurrent chat sessions | 100 | Load testing |
| **Storage** | Photo retention | Max 1 hour after analysis | Cron job audit |
| **Storage** | Chat history retention | 30 days | GDPR cleanup job |
| **Security** | API keys (Mistral, Google, Stripe) | Server-side only, never exposed | Code review |
| **Security** | Photo upload | Max 10 MB, JPEG/PNG/WebP only | Input validation |
| **Security** | Credit operations | Atomic transactions, no negative balance | Integration test |
| **Compliance** | GDPR | Right to deletion for chat + photos | Manual audit |
| **Compliance** | PSD2 | Stripe Checkout (SCA-ready) | Stripe dashboard |
| **I18n** | Languages | 25 (all EU + Turkish) | UI test |

## 3. Data Classification

| Data Type | Classification | Handling |
|-----------|---------------|----------|
| Chat messages | L2 — Internal | Encrypted at rest, 30-day retention |
| Uploaded photos | L2 — Internal | Encrypted, deleted after analysis (1h max) |
| Credit balance | L3 — Confidential | Audit logged, atomic operations |
| Stripe tokens | L4 — Restricted | Never stored, Stripe handles |
| User addresses | L3 — PII | Encrypted at rest, GDPR subject access |
| Route data | L1 — Public | No special handling |

## 4. Technical Constraints

### 4.1 AI Model
- **Provider:** Mistral AI (EU-based)
- **Chat model:** `mistral-large-latest` (or equivalent)
- **Vision model:** `pixtral-large-latest` (or equivalent)
- **Max context:** 128K tokens
- **Tool calling:** Required for structured extraction

### 4.2 External APIs
- **Google Maps Directions API:** Route calculation, requires API key with billing
- **Stripe API:** Payment processing, requires webhook endpoint
- **Mistral AI API:** Chat + Vision, requires API key

### 4.3 Platform Compliance
- [x] Authentication: Keycloak (existing, cds-role header for MVP)
- [x] API Gateway: APISIX (existing routes)
- [x] Database: PostgreSQL (existing cds-postgres)
- [x] Cache: Redis (existing cds-redis, for chat session state)
- [ ] Monitoring: Prometheus metrics for agent module
- [ ] Logging: Structured JSON logs for all AI interactions
- [ ] Audit: Credit ledger as audit trail

## 5. Integration Points

```
┌────────────────────────────────────────────┐
│           Existing CDS Backend             │
│                                            │
│  DemandService ←── AgentModule creates     │
│  VolumeCalculatorService ←── reused        │
│  TransportationService ←── reused          │
│  AddressService ←── reused                 │
│  EstateService ←── reused                  │
│                                            │
│  NEW:                                      │
│  AgentModule ──→ Mistral API               │
│  CalcModule ──→ Google Maps API            │
│  CreditModule ──→ Stripe API              │
│  PaymentModule ──→ Stripe Webhooks         │
└────────────────────────────────────────────┘
```

## 6. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mistral API rate limits | Chat delays | Request queuing, retry with backoff |
| Google Maps API cost | High bill at scale | Cache routes, rate limit per user |
| Photo detection accuracy | Poor UX | Allow manual correction, show confidence |
| Stripe webhook delivery | Lost payments | Idempotency keys, webhook retry |
| GDPR photo retention | Legal risk | Automated cleanup cron job, monitoring |
