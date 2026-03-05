# CDS Team Communication Protocol

## How This Works

Two Claude Code sessions work as a team on the CDS platform. They communicate through shared files, make decisions together, and document everything.

## Roles

### Session A: "Mimar" (Architect)
- **Focus:** System architecture, data models, API design, technology decisions
- **Instructions file:** `docs/team/MIMAR_ROLE.md`
- **Writes to:** `docs/team/discussion.md` (prefixed with `[MIMAR]`)

### Session B: "Muhendis" (Engineer)
- **Focus:** Implementation details, code structure, feasibility analysis, testing strategy
- **Instructions file:** `docs/team/MUHENDIS_ROLE.md`
- **Writes to:** `docs/team/discussion.md` (prefixed with `[MUHENDIS]`)

## Communication Rules

1. **Before acting:** Read `docs/team/discussion.md` for the latest messages
2. **When writing:** Always append to `discussion.md`, never overwrite
3. **When deciding:** Write decisions to `docs/team/decisions.md`
4. **Be concise:** Keep messages focused, not essays
5. **Disagree openly:** If you disagree with the other session, say so with reasoning
6. **Tag decisions:** When you agree on something, one of you writes it to `decisions.md`

## Shared Files

| File | Purpose |
|------|---------|
| `docs/team/discussion.md` | Ongoing conversation between sessions |
| `docs/team/decisions.md` | Finalized decisions |
| `docs/team/mvp-scope.md` | MVP scope document (co-authored) |
| `docs/plans/` | Design documents |

## Context Files (Read-Only Reference)

| File | Content |
|------|---------|
| `docs/plans/2026-03-02-cds-brainstorming-summary.md` | Brainstorming summary with Levent |
| `docs/plans/2026-03-02-cds-evolved-model.md` | Evolved CDS model |
| `docs/Documents/CDS.pdf` | Original whitepaper |
| `Umzug/` | Existing .NET + Angular codebase (moving service) |

## Current Mission

Define and build the CDS MVP:
1. Decide MVP scope (which sector, which features)
2. Decide technology approach (reuse existing code vs. new stack)
3. Design the architecture
4. Implement

## Key Constraints (from brainstorming with Levent)

- **No heavy blockchain** — lightweight distributed verification at most, not MVP priority
- **Deposit/stake mechanism** — economic regulation, not bureaucratic
- **Legally valid digital contracts** — service contracts enforceable in court
- **Low commission (3-5%)** — everyone profits, but efficiently
- **Profit motive is essential** — not a non-profit, rational economics
- **Existing codebase:** .NET 8 backend + Angular 16 frontend for moving services (Umzug/)
- **Target stack (guidelines):** PostgreSQL, Kafka, Redis, Keycloak, React+TypeScript
- **Focus:** Get something real working, avoid over-architecting
