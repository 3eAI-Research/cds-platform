# Product Vision: AI Moving Assistant & Project Planner

## Feature Name
**CDS Moving Assistant** — AI-powered conversational agent for moving demand creation, cost estimation, and project planning.

## Problem Statement
Current moving request creation uses a 4-step form requiring users to manually fill addresses, select furniture from catalogs, choose dates, and configure services. This is:
1. **Tedious** — 4 form steps with 20+ fields
2. **Error-prone** — Users forget items, misestimate volumes
3. **No cost visibility** — Users have no idea what moving will cost before receiving offers
4. **No planning** — No route, crew, or timeline information

## Vision
Replace the traditional multi-step form with a **conversational AI agent** that:
1. **Chats naturally** with the user in their language (25 EU languages + Turkish)
2. **Analyzes photos** of rooms to automatically detect furniture (Mistral Vision)
3. **Calculates a moving project plan** including route, crew size, man-hours, vehicle requirements
4. **Generates a professional PDF report** with the complete plan and cost estimate
5. **Creates the demand** automatically from collected data

## Monetization: Credit System
- Users purchase **credit packs** before using premium features
- Credit packs: 5 credits (5 EUR), 20 credits (15 EUR), 50 credits (30 EUR)
- Moving report = 1 credit
- AI photo analysis = 1 credit
- Demand creation = Free (drives marketplace)
- Payment via **Stripe Checkout** (PSD2 compliant)

## Key Differentiators
- **EU-first**: Mistral AI (French/EU), GDPR compliant, all EU languages
- **Not just price**: Man-hours, route km, duration — not fixed EUR (costs vary by country)
- **Regulation-aware**: 8-hour driving limit (EU tachograph rules), mandatory rest periods
- **Google Maps integration**: Optimal route based on moving day/time, real distance/duration
- **Photo AI**: Take a photo of your room, AI detects and lists furniture automatically

## Success Criteria
- Users complete demand creation via chat in < 5 minutes (vs ~8 min form)
- Photo detection accuracy > 80% for common furniture
- Cost estimate within +/- 20% of actual offers received
- Credit purchase conversion > 15% of users who complete a chat session

## Target Users
- **Customers** (moving requesters): Primary users of the agent
- **Providers** (moving companies): Benefit from better-structured demands with volume data

## External Dependencies
| Service | Purpose | EU Compliance |
|---------|---------|---------------|
| Mistral AI API | Chat + Vision (photo analysis) | French company, EU data |
| Google Maps API | Route calculation, distance, duration | Standard DPA |
| Stripe | Credit pack payments | EU entity, PSD2 compliant |

## Constraints
- All AI processing via backend (API keys never exposed to frontend)
- Chat history stored for 30 days (GDPR: right to deletion)
- Photo uploads processed and deleted after analysis (no long-term storage)
- Credit balance is non-refundable but transferable within account
