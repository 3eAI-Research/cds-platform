# Data Classification: AI Moving Assistant

## Classification Levels (per DATA_GOVERNANCE_GUIDELINE.md)

| Level | Label | Description |
|-------|-------|-------------|
| L1 | Public | Non-sensitive, can be shared freely |
| L2 | Internal | Business data, internal use only |
| L3 | Confidential | PII, financial data, access-controlled |
| L4 | Restricted | Secrets, tokens, keys — never stored in application DB |

## Data Inventory

### Agent Module
| Data | Level | Storage | Retention | Encryption | Notes |
|------|-------|---------|-----------|------------|-------|
| Chat messages | L2 | PostgreSQL (agent_sessions) | 30 days | At rest (AES-256) | GDPR: deletable on request |
| Chat session state | L2 | Redis | Session duration | In-transit (TLS) | Evicted on session end |
| System prompts | L1 | Code/config | Permanent | N/A | No PII |
| Mistral API key | L4 | Environment variable | N/A | K8s secret | Never in DB or logs |

### Photo Analysis
| Data | Level | Storage | Retention | Encryption | Notes |
|------|-------|---------|-----------|------------|-------|
| Uploaded photos | L3 | Temp filesystem | Max 1 hour | At rest | Auto-deleted after analysis |
| Detection results | L2 | PostgreSQL (via chat) | 30 days | At rest | Furniture item list only |

### Credit System
| Data | Level | Storage | Retention | Encryption | Notes |
|------|-------|---------|-----------|------------|-------|
| Credit balance | L3 | PostgreSQL (credits) | Account lifetime | At rest | Audit logged |
| Credit ledger | L3 | PostgreSQL (credit_ledger) | 7 years (financial) | At rest | Immutable, append-only |
| Stripe customer ID | L3 | PostgreSQL (users) | Account lifetime | At rest | Reference only |
| Stripe payment intent | L4 | Stripe (not stored locally) | N/A | Stripe handles | Never in our DB |
| Stripe webhook secret | L4 | Environment variable | N/A | K8s secret | Never in DB or logs |

### Calculator
| Data | Level | Storage | Retention | Encryption | Notes |
|------|-------|---------|-----------|------------|-------|
| Route results | L1 | PostgreSQL (transportation) | Demand lifetime | Standard | Public distance/time data |
| Google Maps API key | L4 | Environment variable | N/A | K8s secret | Never in DB or logs |
| PDF reports | L2 | Object storage (MinIO/S3) | 7 days | At rest | Secure download link |

## GDPR Compliance

### Right to Deletion
When a user requests data deletion:
1. Delete all chat sessions and messages
2. Delete any stored photos (should already be deleted)
3. Keep credit ledger (financial records: 7-year legal requirement)
4. Anonymize demand data (replace PII with placeholder)

### Data Processing Agreement (DPA)
Required with:
- Mistral AI (data processor for chat + photo analysis)
- Google (data processor for route calculation)
- Stripe (data processor for payments — existing DPA)
