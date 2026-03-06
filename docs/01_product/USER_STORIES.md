# User Stories: AI Moving Assistant & Project Planner

## Epic: AGENT — Conversational AI Moving Assistant

### US-AGENT-01: Chat-based demand creation [Must Have]
**As a** customer,
**I want** to describe my move in a natural chat conversation,
**so that** I can create a moving request without filling complex forms.

**Acceptance Criteria:**
- [ ] Agent greets user and asks about move (from/to addresses)
- [ ] Agent collects all required fields: addresses, estate type, rooms, furniture, dates, services
- [ ] Agent understands free-text input (e.g., "Berlin Kreuzberg to Munich" → parsed addresses)
- [ ] Agent works in user's selected language (i18next integration)
- [ ] Chat history persisted per session (max 30 days, GDPR compliant)
- [ ] Agent uses Mistral AI via backend (API key never exposed)
- [ ] On completion, agent shows summary card for user confirmation
- [ ] On "confirm", demand is created via existing POST /api/v1/demands endpoint
- [ ] Error: If address cannot be parsed, agent asks for clarification
- [ ] Error: If required field missing after 3 attempts, agent offers to switch to manual form

### US-AGENT-02: Photo-based furniture detection [Must Have]
**As a** customer,
**I want** to upload photos of my rooms so the AI detects my furniture,
**so that** I don't have to manually select each item from a catalog.

**Acceptance Criteria:**
- [ ] User can upload 1-10 photos per room during chat
- [ ] Photos sent to Mistral Vision API via backend
- [ ] AI returns detected furniture items matched to existing FurnitureType catalog (227 items)
- [ ] Detected items shown as editable list (user can add/remove/adjust quantities)
- [ ] Volume automatically calculated from detected items (existing VolumeCalculatorService)
- [ ] Costs 1 credit per analysis batch (up to 10 photos)
- [ ] Photos deleted from server after analysis (max 1 hour retention)
- [ ] Supported formats: JPEG, PNG, WebP (max 10 MB each)
- [ ] Error: Blurry/unrecognizable photo → agent asks for better photo
- [ ] Error: No credit balance → prompt to purchase credits

### US-AGENT-03: Summary card and confirmation [Must Have]
**As a** customer,
**I want** to review all collected information before submitting,
**so that** I can correct any mistakes.

**Acceptance Criteria:**
- [ ] Summary card displayed as a structured message in chat
- [ ] Shows: from/to addresses, estate details, furniture list with volumes, dates, services
- [ ] User can say "change the date" or "add a wardrobe" and agent updates
- [ ] "Confirm" button creates the demand
- [ ] "Cancel" discards the session
- [ ] Summary card is rendered as a React component within chat (not plain text)

---

## Epic: CALC — Moving Project Plan Calculator

### US-CALC-01: Route calculation [Must Have]
**As a** system,
**I want** to calculate the optimal moving route,
**so that** the project plan includes accurate distance and duration.

**Acceptance Criteria:**
- [ ] Uses Google Maps Directions API
- [ ] Input: from address, to address, preferred date/time
- [ ] Output: distance (km), duration (hours), route waypoints
- [ ] Considers traffic conditions for the selected date/time
- [ ] For distances > 450 km (approx 4.5h driving): flags as long-distance
- [ ] Stores result in `estimatedDistanceKm` field (currently hardcoded to 0)
- [ ] Error: Invalid address → return error with suggestion
- [ ] Error: Google Maps API failure → fallback to Haversine distance from PLZ lat/lng

### US-CALC-02: Crew size calculation [Must Have]
**As a** system,
**I want** to calculate the required crew size,
**so that** the plan shows how many workers are needed.

**Acceptance Criteria:**
- [ ] Formula: based on total volume (m³) and floor levels
- [ ] Base: 2 workers per 20 m³
- [ ] +1 worker if no elevator and floor > 2
- [ ] +1 worker if both from AND to have no elevator
- [ ] Min: 2 workers, Max: 8 workers
- [ ] Output: number of workers, estimated loading time, estimated unloading time
- [ ] Loading time: volume (m³) × 12 min/m³ ÷ workers
- [ ] Unloading time: volume (m³) × 10 min/m³ ÷ workers

### US-CALC-03: Vehicle requirement [Must Have]
**As a** system,
**I want** to determine the vehicle type and count,
**so that** the plan includes logistics details.

**Acceptance Criteria:**
- [ ] Vehicle types: Transporter (≤12 m³), LKW 3.5t (≤25 m³), LKW 7.5t (≤45 m³), LKW 12t (≤65 m³)
- [ ] Select smallest vehicle that fits total volume
- [ ] If volume > 65 m³: multiple vehicles
- [ ] Output: vehicle type, count, estimated fuel cost per km

### US-CALC-04: EU driving regulations [Must Have]
**As a** system,
**I want** to enforce EU driving time regulations,
**so that** the plan is legally compliant.

**Acceptance Criteria:**
- [ ] Max continuous driving: 4.5 hours → mandatory 45 min break
- [ ] Max daily driving: 9 hours (extendable to 10h twice per week)
- [ ] For moves > 9h driving: split into multi-day plan with overnight stop
- [ ] Output: driving segments with break times, total trip duration including breaks
- [ ] Reference: EU Regulation (EC) No 561/2006

### US-CALC-05: Man-hour project plan [Must Have]
**As a** system,
**I want** to generate a complete man-hour breakdown,
**so that** users see effort in hours rather than fixed prices.

**Acceptance Criteria:**
- [ ] Output includes:
  - Loading: X man-hours
  - Driving: X hours (per driver)
  - Unloading: X man-hours
  - Assembly/disassembly: X man-hours (from FurnitureType costs)
  - Packing: X man-hours (if requested)
  - Kitchen: X man-hours (if requested)
  - Total man-hours
  - Total route km
  - Total duration (start to finish)
- [ ] NOT in EUR — man-hours and km only (costs vary by country)
- [ ] ±20% tolerance band shown

### US-CALC-06: PDF report generation [Should Have]
**As a** system,
**I want** to generate a professional PDF report,
**so that** users get a tangible deliverable for their credit.

**Acceptance Criteria:**
- [ ] PDF includes: summary, route map, timeline, man-hour breakdown, vehicle info
- [ ] Branded with CDS Platform logo
- [ ] Generated server-side (no client-side PDF libraries)
- [ ] Downloadable via secure link (expires in 7 days)
- [ ] Stored in object storage (S3/MinIO)
- [ ] Costs 1 credit to generate

---

## Epic: CREDIT — Credit System

### US-CREDIT-01: Purchase credit packs [Must Have]
**As a** customer,
**I want** to buy credit packs,
**so that** I can use premium features like reports and photo analysis.

**Acceptance Criteria:**
- [ ] 3 pack options: 5 credits (5 EUR), 20 credits (15 EUR), 50 credits (30 EUR)
- [ ] Stripe Checkout integration (PSD2 compliant)
- [ ] On successful payment: credits added to user account immediately
- [ ] On failed payment: no credits added, user notified
- [ ] Credit balance visible in header/profile
- [ ] All transactions logged in ledger (audit trail)
- [ ] Error: Stripe webhook failure → retry with idempotency key

### US-CREDIT-02: Spend credits [Must Have]
**As a** system,
**I want** to deduct credits when premium features are used,
**so that** the monetization model works.

**Acceptance Criteria:**
- [ ] Check balance before action (atomic: check + deduct in transaction)
- [ ] Moving report = 1 credit
- [ ] Photo analysis batch = 1 credit
- [ ] Demand creation = Free (0 credits)
- [ ] If insufficient credits: block action, prompt purchase
- [ ] Ledger entry for every deduction (who, what, when, balance after)
- [ ] Credits never go negative

### US-CREDIT-03: Credit balance display [Must Have]
**As a** customer,
**I want** to see my credit balance,
**so that** I know how many credits I have left.

**Acceptance Criteria:**
- [ ] Balance shown in app header (coin icon + number)
- [ ] Click opens credit purchase modal
- [ ] Transaction history page (date, action, amount, balance)
- [ ] Real-time update after purchase or spend

---

## Priority Summary (MoSCoW)

| Priority | Stories |
|----------|---------|
| **Must Have** | US-AGENT-01, US-AGENT-02, US-AGENT-03, US-CALC-01, US-CALC-02, US-CALC-03, US-CALC-04, US-CALC-05, US-CREDIT-01, US-CREDIT-02, US-CREDIT-03 |
| **Should Have** | US-CALC-06 (PDF report) |
| **Could Have** | Voice input, multi-room photo batch |
| **Won't Have** | Real-time provider matching, payment escrow (Phase 2) |
