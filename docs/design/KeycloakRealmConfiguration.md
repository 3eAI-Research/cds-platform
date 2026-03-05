# Keycloak Realm Configuration — CDS Platform

**Version:** 1.0.0
**Date:** 2026-03-04
**Author:** Mimar (Architect)
**Status:** APPROVED — Single realm decision confirmed by Levent (D-022)
**HLD Reference:** `docs/plans/cds-mvp-hld.md` Section 5
**API Contracts:** `docs/domain-model/api-contracts.ts` — AuthApi
**Domain Events:** `docs/domain-model/events.ts` — USER_REGISTERED, USER_PROFILE_UPDATED

---

## 1. Design Decision: Single Realm (HLD Revision)

### 1.1 Problem with 3-Realm Design

HLD Section 5.1 originally specifies 3 realms: `cds-customers`, `cds-providers`, `cds-admin`.

**Problem:** A person who is both a customer (moving their house) and a provider owner (runs a moving company) would need 2 separate Keycloak accounts in different realms. This means:
- 2 separate logins (different sessions, different tokens)
- No way to switch context within the same UI session
- Duplicate PII in 2 realms (GDPR headache — 2 erasure requests needed)
- Germany's moving market includes many small companies — owner often also relocates personally

### 1.2 Proposed: Single Realm with Role Separation

| Aspect | 3 Realms (HLD original) | Single Realm (proposed) |
|--------|------------------------|------------------------|
| User experience | 2 logins for dual-role users | 1 login, role switch in UI |
| GDPR erasure | 3 realm deletions | 1 deletion |
| Keycloak admin | 3× client configs, 3× themes | 1× each |
| Token complexity | Simple (realm = role) | Composite roles in JWT |
| Security isolation | Strongest (separate user stores) | Strong (role-based, same user store) |
| Admin separation | Natural (admin realm separate) | Admin role + RBAC in NestJS |

**Recommendation:** Single realm `cds` for MVP. The security isolation advantage of 3 realms does not justify the UX and operational cost. NestJS guards + Prisma schema isolation provide equivalent data protection.

> **✅ Approved by Levent** (D-022) — HLD Section 5.1 updated.

---

## 2. Realm Configuration

### 2.1 Realm: `cds`

```
Realm name:           cds
Display name:         CDS Platform — Community Driven Services
Default locale:       de
Supported locales:    de, en
Login theme:          cds-custom (Phase 2, Keycloak default for MVP)
Email theme:          cds-custom (Phase 2)
Registration:         ENABLED (self-service)
Email verification:   REQUIRED
Login with email:     ENABLED
Duplicate emails:     DISABLED
Remember me:          ENABLED
```

### 2.2 Password Policy

```
Minimum length:       8
Uppercase:            1
Lowercase:            1
Digit:                1
Special character:    0  (reduces user friction for MVP)
Not username:         true
Password history:     3  (prevent reuse)
Max authentication age: 0 (always require re-auth for sensitive ops)
```

### 2.3 Brute Force Protection

```
Enabled:              true
Max login failures:   5
Wait increment:       30 seconds
Quick login check:    1000ms (block automated attacks)
Max wait:             15 minutes
Failure reset time:   12 hours
```

---

## 3. Realm Roles

### 3.1 Role Hierarchy

```
cds realm
├── customer              — End user requesting moves
├── provider_owner        — Moving company owner (full access)
├── provider_dispatcher   — Moving company dispatcher (operational)
├── provider_worker       — Moving company worker (assigned jobs only)
├── admin                 — Platform administrator
└── super_admin           — Full system access (composite: admin + special)
```

### 3.2 Role Definitions

| Role | Description | Who Assigns | Scope |
|------|-------------|-------------|-------|
| `customer` | Default role on self-registration | Auto (on register) | Own demands, contracts, payments, reviews |
| `provider_owner` | Moving company owner | Self-service (via provider registration flow) | Own company, employees, offers, contracts |
| `provider_dispatcher` | Company operational staff | provider_owner (via employee management) | Company's offers, assigned transports |
| `provider_worker` | Moving crew member | provider_owner (via employee management) | Assigned transport only |
| `admin` | Platform admin | super_admin only | All data read, provider suspension |
| `super_admin` | System administrator | Manual (Keycloak console) | Everything |

### 3.3 Role Assignment Flow

```
Self-Registration → customer role (auto)

Provider Onboarding:
  customer → POST /providers/register → provider_owner added (keeps customer)

Employee Onboarding:
  provider_owner → POST /providers/:id/employees → invitee gets provider_dispatcher or provider_worker
```

**Key:** A user can hold multiple roles simultaneously. `provider_owner` also keeps `customer` role — can create demands for their own moves.

### 3.4 Role Mapping to API Contracts

From `api-contracts.ts` AuthRole type:

| AuthRole | Keycloak Realm Role | Notes |
|----------|-------------------|-------|
| `public` | — (no token required) | Seed data endpoints, PLZ lookup |
| `customer` | `customer` | Demand CRUD, offer accept/reject, payment |
| `provider_owner` | `provider_owner` | Company management, offer submission |
| `provider_dispatcher` | `provider_dispatcher` | Operational offer/transport management |
| `provider_worker` | `provider_worker` | Assigned transport view only |
| `admin` | `admin` | Platform administration |

---

## 4. OAuth2 Clients

### 4.1 Frontend Client (SPA)

```
Client ID:            cds-frontend
Client Protocol:      openid-connect
Access Type:          public (PKCE — no client secret for SPA)
Root URL:             https://cds-platform.de (prod) / http://localhost:3000 (dev)
Valid Redirect URIs:  https://cds-platform.de/*, http://localhost:3000/*
Web Origins:          https://cds-platform.de, http://localhost:3000
Standard Flow:        ENABLED (Authorization Code + PKCE)
Implicit Flow:        DISABLED (security — use PKCE instead)
Direct Access:        DISABLED (no password grant for SPA)
```

**PKCE (Proof Key for Code Exchange):** Required for public clients per OAuth 2.1 / BCP 212. Prevents authorization code interception attacks. React frontend uses `@react-keycloak/web` or `keycloak-js` SDK which handles PKCE automatically.

### 4.2 Backend Client (Confidential)

```
Client ID:            cds-backend
Client Protocol:      openid-connect
Access Type:          confidential (has client_secret)
Service Account:      ENABLED (for admin API calls to Keycloak)
Standard Flow:        DISABLED
Implicit Flow:        DISABLED
Direct Access:        DISABLED
Client Credentials:   ENABLED (service-to-Keycloak communication)
```

**Use Cases:**
- Query Keycloak Admin REST API (user lookup, role assignment)
- Event listener registration
- User deletion (GDPR erasure)

### 4.3 Dev/Test Client

```
Client ID:            cds-dev
Client Protocol:      openid-connect
Access Type:          public
Direct Access:        ENABLED (password grant for dev/test only)
Valid Redirect URIs:  http://localhost:*
```

**⚠️ Dev only.** Direct access grant allows username/password login via REST — useful for integration tests and Postman. Never enable in production.

---

## 5. Token Configuration

### 5.1 Token Lifetimes

| Token | Lifetime | Rationale |
|-------|----------|-----------|
| Access Token | 15 minutes | Short-lived, stateless validation |
| Refresh Token | 8 hours | Single workday session |
| Refresh Token (remember me) | 30 days | Persistent login on trusted devices |
| ID Token | 15 minutes | Matches access token |
| Offline Session | DISABLED (MVP) | No offline access needed |

### 5.2 JWT Access Token Claims

Standard OIDC claims + custom CDS claims via protocol mappers:

```json
{
  "iss": "https://auth.cds-platform.de/realms/cds",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "aud": "cds-frontend",
  "exp": 1709567400,
  "iat": 1709566500,
  "auth_time": 1709566500,
  "azp": "cds-frontend",

  "realm_access": {
    "roles": ["customer", "provider_owner"]
  },

  "email": "max@example.de",
  "email_verified": true,
  "name": "Max Mustermann",
  "preferred_username": "max@example.de",
  "locale": "de",

  "cds_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "cds_provider_company_id": "660e8400-e29b-41d4-a716-446655441111"
}
```

### 5.3 Custom Protocol Mappers

| Mapper Name | Type | Token Claim | Source | Purpose |
|------------|------|-------------|--------|---------|
| `cds-user-id` | User Attribute → Token Claim | `cds_user_id` | `sub` (user ID) | Consistent user ID across tokens |
| `cds-provider-company-id` | User Attribute → Token Claim | `cds_provider_company_id` | User attribute | Provider context for multi-company support |
| `cds-locale` | User Attribute → Token Claim | `locale` | User preference | Localization |
| `realm-roles` | Realm Role → Token Claim | `realm_access.roles` | Realm roles | Authorization |

### 5.4 NestJS JWT Validation

```typescript
// How NestJS validates and extracts from Keycloak JWT:

interface JwtPayload {
  sub: string;                    // Keycloak user ID (= our userId)
  email: string;
  name: string;
  realm_access: {
    roles: string[];              // ['customer', 'provider_owner']
  };
  cds_provider_company_id?: string; // Only for provider roles
  locale: string;                 // 'de' | 'en'
}

// Guard extracts this into request context:
interface RequestUser {
  userId: string;                 // from sub
  email: string;
  displayName: string;            // from name
  roles: AuthRole[];              // from realm_access.roles
  providerCompanyId?: string;     // from cds_provider_company_id
  locale: string;
}
```

---

## 6. User Registration Flow

### 6.1 Customer Registration

```
Browser → Keycloak Login Page → "Register" link
  → Name, Email, Password form
  → Keycloak creates user (auto-assigns "customer" role)
  → Email verification sent
  → User clicks verification link
  → Keycloak redirects to frontend with authorization code
  → Frontend exchanges code for tokens (PKCE)
  → Backend receives JWT → extracts user info
  → AUTH MODULE publishes USER_REGISTERED event
  → Shared module creates user_reference record
```

### 6.2 Provider Registration (Upgrade Path)

```
Existing customer → clicks "Become a Provider" in UI
  → POST /api/v1/providers/register { name, taxNumber, ... }
  → Backend calls Keycloak Admin API:
      PUT /admin/realms/cds/users/{userId}/role-mappings/realm
      → Adds "provider_owner" role
  → Provider module creates ProviderCompany record
  → Publishes PROVIDER_REGISTERED event
  → Next: deposit payment flow
```

**Key:** Provider registration is an "upgrade" — user already exists as customer.

### 6.3 Employee Invitation

```
Provider owner → POST /api/v1/providers/:id/employees
  { email, role: "provider_dispatcher" }

  → If user exists in Keycloak:
      → Add provider role via Admin API
      → Create ProviderEmployee record
  → If user does NOT exist:
      → Create Keycloak user with temporary password
      → Assign provider role
      → Send invitation email with password reset link
      → Create ProviderEmployee record
```

---

## 7. Keycloak Event Listeners

### 7.1 Event Strategy

Keycloak publishes internal events (login, register, profile update). CDS needs to sync these to the platform database.

**MVP Approach:** Keycloak Admin Events → Backend polling
**Phase 2:** Custom Keycloak SPI → Kafka → Event consumers

### 7.2 MVP: REST Polling

```
NestJS Cron Job (every 30 seconds):
  → GET /admin/realms/cds/events?type=REGISTER
  → For each new registration event:
      → Publish USER_REGISTERED to NestJS EventEmitter
      → Shared module creates user_reference
      → Mark event as processed (idempotency table)
```

**Why polling (not webhook/SPI) for MVP:**
- Keycloak's built-in event system requires custom Java SPI deployment
- REST polling is simple, reliable, good enough for MVP user volumes
- Phase 2: Deploy custom SPI that publishes to Kafka directly

### 7.3 Events to Capture

| Keycloak Event | CDS Domain Event | Action |
|---------------|------------------|--------|
| `REGISTER` | `USER_REGISTERED` | Create user_reference, assign default role |
| `UPDATE_PROFILE` | `USER_PROFILE_UPDATED` | Update user_reference (email, name) |
| `DELETE_ACCOUNT` | `USER_DELETED` | Trigger cross-module erasure cascade |
| `LOGIN` | — (logged only) | Audit trail, anomaly detection (Phase 2) |
| `LOGIN_ERROR` | — (logged only) | Brute force monitoring |

---

## 8. GDPR Considerations

### 8.1 Data Minimization in Keycloak

Only store required user attributes:

| Attribute | Required | Rationale |
|-----------|----------|-----------|
| `email` | Yes | Login identifier, communication |
| `firstName` + `lastName` | Yes | Display name, contract generation |
| `locale` | Yes | UI language preference |
| `cds_provider_company_id` | Conditional | Provider context (only for providers) |
| Phone number | No | Not stored in Keycloak (stored in provider module only) |
| Address | No | Not stored in Keycloak (stored in domain modules) |

### 8.2 Right to Erasure (Article 17)

```
User requests account deletion:
  → DELETE /api/v1/auth/account
  → Backend orchestrates deletion cascade:
      1. Publish USER_DELETED event
      2. Each module deletes/anonymizes user data (parallel)
      3. After all modules confirm:
          → Keycloak Admin API: DELETE /admin/realms/cds/users/{userId}
          → Delete shared.user_references record
          → Delete shared.consent_records for this user
```

### 8.3 Data Portability (Article 20)

```
GET /api/v1/auth/data-export
  → Collects user data from all modules (service calls)
  → Returns JSON bundle (DataExportResponse from api-contracts.ts)
  → Keycloak user data included via Admin REST API
```

### 8.4 Consent Management

Consent records stored in `shared.consent_records` (not in Keycloak).
Keycloak handles authentication consent (OIDC scope consent screen).
CDS handles business consent (terms of service, privacy policy, cookies, marketing).

---

## 9. Docker Compose Configuration (Dev)

```yaml
# docker/docker-compose.yml (Keycloak section)
keycloak:
  image: quay.io/keycloak/keycloak:24.0
  command: start-dev
  environment:
    KC_DB: postgres
    KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
    KC_DB_USERNAME: keycloak
    KC_DB_PASSWORD: keycloak_dev_password
    KC_HOSTNAME: localhost
    KC_HTTP_PORT: 8080
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin
    KC_FEATURES: "declarative-user-profile"
  ports:
    - "8080:8080"
  depends_on:
    postgres:
      condition: service_healthy
```

**Note:** Keycloak uses a SEPARATE database (`keycloak` DB) on the same PostgreSQL instance. CDS application data is in the `cds` database. This is Keycloak's recommended setup — it manages its own schema.

### 9.1 Realm Import (Dev Bootstrap)

```yaml
# Mount realm export file for automatic import on first start
volumes:
  - ./keycloak/cds-realm.json:/opt/keycloak/data/import/cds-realm.json
command: start-dev --import-realm
```

The `cds-realm.json` file contains all realm, client, role, and mapper configurations. Generated once from Keycloak admin console, then version-controlled.

---

## 10. Production Considerations (Phase 2)

| Aspect | Dev (MVP) | Production |
|--------|-----------|------------|
| Mode | `start-dev` | `start --optimized` (pre-built) |
| Database | Shared PostgreSQL instance | Dedicated PostgreSQL (or managed) |
| HTTPS | HTTP (localhost) | Required (Let's Encrypt / managed cert) |
| Hostname | localhost:8080 | auth.cds-platform.de |
| Admin console | Enabled | IP-restricted or disabled |
| Custom theme | Keycloak default | CDS branded (login, email) |
| HA | Single instance | 2+ instances + shared DB + infinispan |
| Event listener | REST polling | Custom SPI → Kafka |
| MFA | Disabled | Optional TOTP for provider_owner + admin |

---

## 11. Implementation Checklist

### For Muhendis — Görev 2 (Docker Compose)

- [ ] Add Keycloak service to docker-compose.yml
- [ ] Create separate `keycloak` database in PostgreSQL init script
- [ ] Verify Keycloak starts and admin console accessible at localhost:8080

### For Muhendis — Görev 4 (JWT Auth Guard)

- [ ] Install `@nestjs/passport`, `passport-jwt`, `jwks-rsa`
- [ ] Configure JWT strategy to validate against Keycloak's JWKS endpoint
- [ ] Extract `RequestUser` from JWT claims (sub, roles, email, locale)
- [ ] Implement `@Public()` decorator to skip auth (used by Transport endpoints)
- [ ] Implement `@Roles()` decorator for role-based access
- [ ] **MVP stub**: Guard passes all requests (Keycloak not configured yet), but structure is ready

### For Mimar — Future Sprint (Auth Module)

- [ ] Create `cds-realm.json` export file for dev bootstrap
- [ ] Implement Keycloak event polling (USER_REGISTERED → user_reference)
- [ ] Implement provider role upgrade flow
- [ ] Implement GDPR erasure cascade
- [ ] Custom Keycloak login theme (Phase 2)

---

## 12. Open Question for Levent

**Single Realm vs 3 Realms:**

The HLD specifies 3 realms (cds-customers, cds-providers, cds-admin). I recommend switching to a single `cds` realm for the reasons in Section 1. This changes HLD Section 5.1 but simplifies everything.

**Impact if approved:**
- HLD Section 5.1: Update realm table (3 rows → 1 row with multiple roles)
- No impact on permission matrix (Section 5.2) — roles remain the same
- No impact on api-contracts.ts — AuthRole type stays the same
- No impact on Prisma schemas — no auth-specific schema
- Simplifies Keycloak admin: 1 realm to manage instead of 3

**Impact if rejected (keep 3 realms):**
- Dual-role users need workaround (cross-realm identity linking or 2 accounts)
- 3× Keycloak client configurations
- More complex token validation (which realm issued the token?)
- GDPR erasure must cascade across 3 realms
