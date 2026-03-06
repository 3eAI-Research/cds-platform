# AI Moving Assistant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 3 new NestJS modules (Agent, Credit, Payment) with Mistral AI chat, photo analysis, Google Maps routing, EU regulation calculator, PDF reports, Stripe credit system, and React chat UI.

**Architecture:** New modules follow existing pattern (Module→Controller→Service→DTO). Multi-schema Prisma for `agent` and `credit` schemas. Redis for chat session state. Frontend chat component replaces existing demand creation form.

**Tech Stack:** NestJS 10, Prisma 6, Redis (ioredis), Mistral AI SDK (`@mistralai/mistralai`), Google Maps API (`@googlemaps/google-maps-services-js`), Stripe SDK (`stripe`), PDFKit (`pdfkit`), React 18 + Ant Design chat UI.

---

## Task 1: Install dependencies and configure environment

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/.env`

**Step 1: Install backend packages**

Run:
```bash
cd apps/api && npm install @mistralai/mistralai @googlemaps/google-maps-services-js stripe ioredis pdfkit @nestjs/bull bull && npm install -D @types/pdfkit
```

**Step 2: Add environment variables**

Add to `.env.example` and `.env`:
```env
# AI Agent
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-large-latest
MISTRAL_VISION_MODEL=pixtral-large-latest

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_STANDARD=price_xxx
STRIPE_PRICE_PRO=price_xxx

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Step 3: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/.env.example
git commit -m "chore: add Mistral, Google Maps, Stripe, Redis dependencies"
```

---

## Task 2: Create Prisma schemas (agent + credit)

**Files:**
- Create: `apps/api/prisma/agent.prisma`
- Create: `apps/api/prisma/credit.prisma`
- Modify: `apps/api/prisma/schema.prisma` (add to schema list)

**Step 1: Create agent schema**

```prisma
// apps/api/prisma/agent.prisma

model AgentSession {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  state           String   @default("ACTIVE") // ACTIVE, COLLECTING, SUMMARY, SUBMITTED, COMPLETED, CANCELLED, EXPIRED
  extractedData   Json?    @map("extracted_data") @db.JsonB
  demandId        String?  @map("demand_id") @db.Uuid
  reportId        String?  @map("report_id") @db.Uuid
  completionPct   Int      @default(0) @map("completion_pct")
  messageCount    Int      @default(0) @map("message_count")
  photoCount      Int      @default(0) @map("photo_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz
  expiresAt       DateTime @map("expires_at") @db.Timestamptz
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz

  messages AgentMessage[]

  @@map("agent_sessions")
  @@schema("agent")
  @@index([userId])
  @@index([state])
}

model AgentMessage {
  id        String   @id @default(uuid()) @db.Uuid
  sessionId String   @map("session_id") @db.Uuid
  role      String   // user, assistant, system
  content   String   @db.Text
  metadata  Json?    @db.JsonB // tool calls, detected items, etc.
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  session AgentSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("agent_messages")
  @@schema("agent")
  @@index([sessionId])
}

model AgentReport {
  id          String   @id @default(uuid()) @db.Uuid
  sessionId   String   @map("session_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  demandId    String?  @map("demand_id") @db.Uuid
  planData    Json     @map("plan_data") @db.JsonB
  pdfPath     String?  @map("pdf_path")
  downloadUrl String?  @map("download_url")
  expiresAt   DateTime @map("expires_at") @db.Timestamptz
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("agent_reports")
  @@schema("agent")
  @@index([userId])
  @@index([sessionId])
}

model AgentProcessedEvent {
  id              String   @id @default(uuid()) @db.Uuid
  eventType       String   @map("event_type")
  idempotencyKey  String   @unique @map("idempotency_key")
  processedAt     DateTime @default(now()) @map("processed_at") @db.Timestamptz
  payload         Json?    @db.JsonB

  @@map("agent_processed_events")
  @@schema("agent")
}
```

**Step 2: Create credit schema**

```prisma
// apps/api/prisma/credit.prisma

model Credit {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  balance   Int      @default(0) // never negative
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("credits")
  @@schema("credit")
}

model CreditLedger {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  type         String   // PURCHASE, SPEND, REFUND, ADJUSTMENT
  amount       Int      // positive for add, negative for deduct
  balanceAfter Int      @map("balance_after")
  action       String?  // photo_analysis, report, credit_pack_starter, etc.
  referenceId  String?  @map("reference_id") // sessionId, stripeSessionId, etc.
  description  String?
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("credit_ledger")
  @@schema("credit")
  @@index([userId])
  @@index([type])
  @@index([createdAt])
}

model PaymentTransaction {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  stripeSessionId   String   @unique @map("stripe_session_id")
  packId            String   @map("pack_id") // starter, standard, pro
  credits           Int      // credits to add
  amountCents       Int      @map("amount_cents") // EUR cents
  currency          String   @default("eur")
  status            String   @default("pending") // pending, completed, failed, expired
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  completedAt       DateTime? @map("completed_at") @db.Timestamptz

  @@map("payment_transactions")
  @@schema("credit")
  @@index([userId])
  @@index([status])
}

model CreditProcessedEvent {
  id              String   @id @default(uuid()) @db.Uuid
  eventType       String   @map("event_type")
  idempotencyKey  String   @unique @map("idempotency_key")
  processedAt     DateTime @default(now()) @map("processed_at") @db.Timestamptz
  payload         Json?    @db.JsonB

  @@map("credit_processed_events")
  @@schema("credit")
}
```

**Step 3: Update schema.prisma to include new schemas**

Add `"agent"` and `"credit"` to the `schemas` array in the datasource/generator config.

**Step 4: Run migration**

```bash
cd apps/api && npx prisma db push
```

**Step 5: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add agent and credit Prisma schemas"
```

---

## Task 3: Create Redis module

**Files:**
- Create: `apps/api/src/redis/redis.module.ts`
- Create: `apps/api/src/redis/redis.service.ts`
- Modify: `apps/api/src/app.module.ts` (import RedisModule)

**Step 1: Create RedisService**

```typescript
// apps/api/src/redis/redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const json = JSON.stringify(value);
    if (ttlSeconds) {
      await this.set(key, json, 'EX', ttlSeconds);
    } else {
      await this.set(key, json);
    }
  }
}
```

**Step 2: Create RedisModule**

```typescript
// apps/api/src/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

**Step 3: Import in app.module.ts**

Add `RedisModule` to the imports array.

**Step 4: Commit**

```bash
git add apps/api/src/redis/ apps/api/src/app.module.ts
git commit -m "feat: add global Redis module with ioredis"
```

---

## Task 4: Create Credit Module (backend)

**Files:**
- Create: `apps/api/src/modules/credit/credit.module.ts`
- Create: `apps/api/src/modules/credit/controllers/credit.controller.ts`
- Create: `apps/api/src/modules/credit/services/credit.service.ts`
- Create: `apps/api/src/modules/credit/dto/credit.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/common/types/error-codes.ts` (add BUS_INSUFFICIENT_CREDITS etc.)

**Step 1: Create DTOs**

```typescript
// credit.dto.ts
export class CreditBalanceResponse {
  balance: number;
  userId: string;
}

export class CreditTransactionResponse {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  action: string | null;
  description: string | null;
  createdAt: string;
}

export class ListTransactionsDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) pageSize?: number = 20;
}
```

**Step 2: Create CreditService**

Core methods:
- `getBalance(userId)` — returns current balance (creates record if not exists)
- `deductCredits(userId, amount, action, referenceId)` — atomic check + deduct in Prisma transaction
- `addCredits(userId, amount, type, action, referenceId)` — add credits + ledger entry
- `getTransactions(userId, page, pageSize)` — paginated ledger

Key business rule (BR-CRD-002): Atomic deduction uses Prisma `$transaction` to check balance >= amount, then decrement and create ledger entry in one operation.

**Step 3: Create CreditController**

- `GET /api/v1/credits/balance` — @Roles('customer', 'provider_owner')
- `GET /api/v1/credits/transactions` — paginated list

**Step 4: Add error codes**

Add to `error-codes.ts`:
```typescript
BUS_INSUFFICIENT_CREDITS = 'BUS_INSUFFICIENT_CREDITS',
BUS_SESSION_EXPIRED = 'BUS_SESSION_EXPIRED',
BUS_SESSION_NOT_FOUND = 'BUS_SESSION_NOT_FOUND',
BUS_PHOTO_TOO_LARGE = 'BUS_PHOTO_TOO_LARGE',
BUS_PHOTO_INVALID_TYPE = 'BUS_PHOTO_INVALID_TYPE',
BUS_ROUTE_UNAVAILABLE = 'BUS_ROUTE_UNAVAILABLE',
BUS_AI_UNAVAILABLE = 'BUS_AI_UNAVAILABLE',
```

**Step 5: Register in app.module.ts and commit**

```bash
git add apps/api/src/modules/credit/ apps/api/src/common/types/error-codes.ts apps/api/src/app.module.ts
git commit -m "feat: add Credit module with balance and ledger"
```

---

## Task 5: Create Stripe Payment Module (backend)

**Files:**
- Create: `apps/api/src/modules/stripe/stripe.module.ts`
- Create: `apps/api/src/modules/stripe/controllers/stripe.controller.ts`
- Create: `apps/api/src/modules/stripe/services/stripe.service.ts`
- Create: `apps/api/src/modules/stripe/dto/stripe.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create DTOs**

```typescript
// stripe.dto.ts
export const CREDIT_PACKS = {
  starter: { credits: 5, amountCents: 500, label: 'Starter' },
  standard: { credits: 20, amountCents: 1500, label: 'Standard' },
  pro: { credits: 50, amountCents: 3000, label: 'Pro' },
} as const;

export class CreateCheckoutDto {
  @IsIn(['starter', 'standard', 'pro']) packId: string;
}

export class CreditPackResponse {
  packId: string;
  credits: number;
  amountCents: number;
  label: string;
}
```

**Step 2: Create StripeService**

- `createCheckoutSession(userId, packId)` — Create Stripe Checkout session, store in PaymentTransaction
- `handleWebhook(payload, signature)` — Verify signature, process checkout.session.completed
  - Idempotency: Check if stripeSessionId already processed
  - On success: Call `creditService.addCredits()`, update PaymentTransaction status

**Step 3: Create StripeController**

- `GET /api/v1/payments/packs` — @Public() — List available packs
- `POST /api/v1/payments/checkout` — @Roles('customer', 'provider_owner') — Create checkout
- `POST /api/v1/payments/webhook` — @Public() — Stripe webhook (raw body, signature verification)

**Step 4: Register and commit**

```bash
git add apps/api/src/modules/stripe/
git commit -m "feat: add Stripe payment module for credit purchases"
```

---

## Task 6: Create Mistral AI Service

**Files:**
- Create: `apps/api/src/modules/agent/services/mistral.service.ts`

**Step 1: Create MistralService**

Wraps Mistral AI SDK:
- `chat(messages[], tools[])` — Send chat completion with tool calling support
- `analyzePhoto(imageBuffers[])` — Send images to Mistral Vision, return detected items
- System prompt defines agent personality, language, extraction tools

**System prompt structure:**
```
You are a moving assistant for CDS Platform. You help users create moving requests by collecting:
1. From address (street, house number, postal code, city)
2. To address
3. Estate type (apartment, house, office, warehouse)
4. Square meters and rooms
5. Furniture list
6. Preferred dates
7. Additional services

Extract structured data using the provided tools. Always respond in the user's language.
```

**Tool definitions for Mistral:**
- `extract_address` — { street, houseNumber, postCode, placeName, floor, elevator }
- `extract_estate` — { estateTypeId, totalSquareMeters, numberOfRooms }
- `extract_furniture` — [{ name, quantity, category }]
- `extract_dates` — { preferredDateStart, preferredDateEnd, dateFlexibility }
- `extract_services` — { furnitureMontage, kitchenMontage, packingService, halteverbotRequired, serviceType, numberOfPeople }
- `show_summary` — Called when all required fields collected
- `update_field` — Called when user wants to change a specific field

**Step 2: Commit**

```bash
git add apps/api/src/modules/agent/services/mistral.service.ts
git commit -m "feat: add MistralService with chat and vision support"
```

---

## Task 7: Create Plan Calculator Service

**Files:**
- Create: `apps/api/src/modules/agent/services/plan-calculator.service.ts`

**Step 1: Create PlanCalculatorService**

Implements all BR-CALC rules:

```typescript
// Core method
async calculatePlan(input: PlanInput): Promise<MovingPlan> {
  // 1. Calculate volume (reuse VolumeCalculatorService)
  const volume = await this.volumeCalculator.estimateVolume(input.furniture);

  // 2. Calculate route (Google Maps with PLZ fallback)
  const route = await this.calculateRoute(input.fromAddress, input.toAddress, input.preferredDate);

  // 3. Determine vehicle (BR-CALC-003)
  const vehicle = this.selectVehicle(volume.totalVolume);

  // 4. Calculate crew (BR-CALC-002)
  const crew = this.calculateCrew(volume.totalVolume, input.fromEstate, input.toEstate);

  // 5. Apply EU driving regulations (BR-CALC-004)
  const drivingPlan = this.applyDrivingRegulations(route.durationHours);

  // 6. Man-hour breakdown (BR-CALC-005)
  const timeline = this.calculateManHours(volume, crew, route, input.services, input.furniture);

  return { route, vehicle, crew, timeline, volume, toleranceBand: '±20%' };
}
```

Sub-methods:
- `calculateRoute(from, to, date)` — Google Maps Directions API, fallback to Haversine
- `haversineFallback(fromPlz, toPlz)` — Use PLZ lat/lng from existing PostCode table
- `selectVehicle(volumeM3)` — Decision matrix from BR-CALC-003
- `calculateCrew(volume, fromEstate, toEstate)` — Formula from BR-CALC-002
- `applyDrivingRegulations(drivingHours)` — EU EC 561/2006 segments
- `calculateManHours(...)` — Full breakdown per BR-CALC-005

**Step 2: Commit**

```bash
git add apps/api/src/modules/agent/services/plan-calculator.service.ts
git commit -m "feat: add PlanCalculatorService with route, crew, vehicle, EU regulations"
```

---

## Task 8: Create Photo Analyzer Service

**Files:**
- Create: `apps/api/src/modules/agent/services/photo-analyzer.service.ts`

**Step 1: Create PhotoAnalyzerService**

- `analyzePhotos(photos: Buffer[], locale: string)` — Send to Mistral Vision
- `matchToFurnitureCatalog(detectedItems[])` — Fuzzy match detected names to FurnitureType table
- Confidence thresholds per BR-AGT-008: >80% auto-add, 50-80% suggest, <50% manual

Uses existing `FurnitureTypeService` to query the catalog (227 items × 6 languages).

**Step 2: Commit**

```bash
git add apps/api/src/modules/agent/services/photo-analyzer.service.ts
git commit -m "feat: add PhotoAnalyzerService with Mistral Vision integration"
```

---

## Task 9: Create Report Service (PDF)

**Files:**
- Create: `apps/api/src/modules/agent/services/report.service.ts`

**Step 1: Create ReportService**

- `generateReport(sessionId, plan, extractedData)` — Generate PDF via PDFKit
- PDF content: Summary header, from/to addresses, furniture list, route map placeholder, timeline breakdown, man-hour totals, crew/vehicle info, ±20% tolerance note
- Store PDF path in AgentReport table
- Generate secure download URL (UUID-based path, 7-day expiry)

**Step 2: Commit**

```bash
git add apps/api/src/modules/agent/services/report.service.ts
git commit -m "feat: add ReportService for PDF generation"
```

---

## Task 10: Create Agent Module (main orchestrator)

**Files:**
- Create: `apps/api/src/modules/agent/agent.module.ts`
- Create: `apps/api/src/modules/agent/controllers/agent.controller.ts`
- Create: `apps/api/src/modules/agent/services/agent.service.ts`
- Create: `apps/api/src/modules/agent/dto/agent.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create DTOs**

```typescript
// agent.dto.ts
export class CreateSessionResponse { sessionId: string; state: string; }

export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) content: string;
}

export class ChatMessageResponse {
  sessionId: string;
  messages: { role: string; content: string; timestamp: string }[];
  extractedData: Record<string, unknown> | null;
  state: string;
  completionPercentage: number;
}
```

**Step 2: Create AgentService**

Core orchestrator — implements the full chat session flow from BA process map:

- `createSession(userId)` — Create Redis session + DB record, state=ACTIVE
- `sendMessage(sessionId, userId, content)` — Main flow:
  1. Load session from Redis
  2. Add user message to conversation history
  3. Call MistralService with history + tools
  4. Process tool calls (extract_address → validate against PLZ, etc.)
  5. Update extractedData in session
  6. Calculate completionPercentage
  7. If all required fields: auto-trigger show_summary tool → state=SUMMARY
  8. Save to Redis (refresh 30-min TTL) + persist message to DB
  9. Return ChatMessageResponse
- `uploadPhotos(sessionId, userId, photos)` — Deduct credit, call PhotoAnalyzer, add to furniture
- `confirmDemand(sessionId, userId)` — Build CreateDemandDto from extractedData, call DemandService.create()
- `generatePlan(sessionId, userId)` — Deduct credit, call PlanCalculator, call ReportService
- `getSession(sessionId, userId)` — Return current state
- `cancelSession(sessionId, userId)` — state=CANCELLED, cleanup Redis

**Step 3: Create AgentController**

- `POST /api/v1/agent/sessions` — @Roles('customer')
- `POST /api/v1/agent/sessions/:id/messages` — @Roles('customer')
- `POST /api/v1/agent/sessions/:id/photos` — @Roles('customer'), multipart upload
- `POST /api/v1/agent/sessions/:id/confirm` — @Roles('customer')
- `POST /api/v1/agent/sessions/:id/plan` — @Roles('customer')
- `GET /api/v1/agent/sessions/:id` — @Roles('customer')
- `DELETE /api/v1/agent/sessions/:id` — @Roles('customer')
- `GET /api/v1/reports/:id/download` — @Roles('customer'), send PDF file

**Step 4: Create AgentModule**

Import: TransportModule, CreditModule, DemandModule
Providers: AgentService, MistralService, PlanCalculatorService, PhotoAnalyzerService, ReportService

**Step 5: Register in app.module.ts and commit**

```bash
git add apps/api/src/modules/agent/ apps/api/src/app.module.ts
git commit -m "feat: add Agent module with chat, photo, plan, report endpoints"
```

---

## Task 11: Create Chat UI component (frontend)

**Files:**
- Create: `apps/web/src/components/chat/chat-container.tsx`
- Create: `apps/web/src/components/chat/chat-message.tsx`
- Create: `apps/web/src/components/chat/chat-input.tsx`
- Create: `apps/web/src/components/chat/summary-card.tsx`
- Create: `apps/web/src/components/chat/photo-upload.tsx`

**Step 1: Create ChatMessage component**

Renders individual messages with:
- User messages (right-aligned, blue bubble)
- Assistant messages (left-aligned, gray bubble)
- Summary card (special rendered component when state=SUMMARY)
- Photo analysis results (furniture list with edit controls)

**Step 2: Create ChatInput component**

- Text input with send button
- Photo upload button (paperclip icon)
- Disabled when waiting for response

**Step 3: Create SummaryCard component**

- Structured display of extractedData
- From/to addresses, estate info, furniture list, dates, services
- "Confirm" and "Change" buttons
- "Generate Report" button (shows credit cost)

**Step 4: Create PhotoUpload component**

- Drag & drop or click to upload
- Max 10 files, max 10 MB each
- Preview thumbnails
- Shows credit cost before analysis

**Step 5: Create ChatContainer (orchestrator)**

- Manages session state (create, messages, photos, confirm)
- Auto-scroll to latest message
- Loading indicators during AI response
- Error handling with retry
- Calls API endpoints from Task 10

**Step 6: Commit**

```bash
git add apps/web/src/components/chat/
git commit -m "feat: add Chat UI components (messages, input, summary, photo)"
```

---

## Task 12: Create demand creation page with agent

**Files:**
- Modify: `apps/web/src/pages/demands/create.tsx` (replace form with chat)
- Create: `apps/web/src/components/chat/credit-balance.tsx`

**Step 1: Replace DemandCreate page**

Replace the existing 4-step form with the ChatContainer component.
Keep the old form as a fallback option ("Switch to manual form" link).

**Step 2: Create CreditBalance component**

- Shows credit balance in header (coin icon + number)
- Click opens credit purchase modal with 3 pack options
- Calls Stripe checkout on pack selection

**Step 3: Add credit balance to header**

Modify header.tsx to include CreditBalance component for customer role.

**Step 4: Add i18n keys for agent/chat/credits**

Update `de.ts`, `en.ts`, `tr.ts` with new translation keys.

**Step 5: Commit**

```bash
git add apps/web/src/pages/demands/create.tsx apps/web/src/components/chat/ apps/web/src/components/header.tsx apps/web/src/i18n/
git commit -m "feat: replace demand form with AI chat agent, add credit balance"
```

---

## Task 13: Add admin pages for agent and credits

**Files:**
- Create: `apps/web/src/pages/admin/agent-sessions.tsx`
- Create: `apps/web/src/pages/admin/credit-overview.tsx`
- Modify: `apps/web/src/App.tsx` (add admin routes)

**Step 1: Agent Sessions admin page**

- Table listing all sessions (userId, state, messageCount, photoCount, createdAt)
- Click to view chat history (read-only)

**Step 2: Credit Overview admin page**

- Table listing all user balances
- Click to view transaction ledger for a user
- Payment transactions list (Stripe sessions)

**Step 3: Add routes and sidebar items**

Add to App.tsx resources for admin role.

**Step 4: Commit**

```bash
git add apps/web/src/pages/admin/ apps/web/src/App.tsx
git commit -m "feat: add admin pages for agent sessions and credit overview"
```

---

## Task 14: Integration test and final verification

**Step 1: Start services**

```bash
docker start cds-postgres cds-redis
cd apps/api && npm run start:dev &
cd apps/web && npm run dev &
```

**Step 2: Test credit flow**

1. Login as customer
2. Check credit balance (should be 0)
3. Purchase starter pack (5 credits)
4. Verify balance updates to 5

**Step 3: Test agent chat flow**

1. Navigate to "New Moving Request"
2. Chat with agent: "I'm moving from Berlin to Munich"
3. Agent should ask for details
4. Upload a photo of a room
5. Agent detects furniture
6. Complete all required fields
7. Confirm and create demand
8. Generate report (1 credit)

**Step 4: Test admin pages**

1. Switch to admin role
2. View agent sessions
3. View credit overview

**Step 5: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete AI Moving Assistant with agent, credits, Stripe"
git push
```
