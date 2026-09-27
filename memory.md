# RentalCircle — Living Project State & Checkpoint Ledger (memory.md)

> **Document Status**: `LIVING SYSTEM RECORD`  
> **Version**: 2.0 (Streamlined Control Ledger)  
> **Related Documents**: [prd.md](file:///Users/mahesh/Desktop/therentalcircle/prd.md) | [architecture.md](file:///Users/mahesh/Desktop/therentalcircle/architecture.md) | [tasks.md](file:///Users/mahesh/Desktop/therentalcircle/tasks.md)

---

## 1. Checkpoint & Failure Recovery Protocol

### The Anti-Hallucination Invariant
> **"A task is NEVER marked `[x] COMPLETED` based on intent or code generation alone. A task is ONLY marked completed after executing the verification command, reading the command output, and confirming zero errors."**

### Resumption Protocol (Upon Context Reset or Interruption)
1. Read `memory.md` to identify the active Slice and last verified checkpoint.
2. Inspect the real filesystem (`ls -la`, `git status`) to confirm file presence.
3. Re-run the verification command for the last claimed task before resuming.
4. Continue strictly from the confirmed working state.

### Standardized Status Vocabulary
* `[ ] TODO`: Task identified; work has not begun.
* `[~] IN PROGRESS`: Task actively being executed.
* `[x] COMPLETED`: Task verified working via real command execution with zero errors.
* `[!] BLOCKED`: Task halted due to external blocker or missing prerequisite.
* `[?] NEEDS DECISION`: Task pending product clarification before execution.
* `[-] CANCELLED`: Task formally removed from scope.

---

## 2. Canonical Document State

| Document | Canonical Authority | Status | Summary |
|---|---|---|---|
| [prd.md](file:///Users/mahesh/Desktop/therentalcircle/prd.md) | Product Authority | ✅ `APPROVED` | Full real-estate platform vision, conceptual hierarchy, MVP-0 journeys, roadmap. |
| [architecture.md](file:///Users/mahesh/Desktop/therentalcircle/architecture.md) | Technical Architecture | ✅ `CONSOLIDATED` | Modular monolith (`com.platform.*`), 17 tables, 6 Flyway migrations, storage isolation. |
| [design.md](file:///Users/mahesh/Desktop/therentalcircle/design.md) | Visual & UX System | ✅ `LOCKED` | Brand tokens, DM Serif Display / Manrope, dual-pane search, marketplace components. |
| [tasks.md](file:///Users/mahesh/Desktop/therentalcircle/tasks.md) | Execution Roadmap | ✅ `VERTICAL SLICES`| 8 product-driven slices (Slices 1 to 8) with explicit DoD and verification commands. |
| [decisions.md](file:///Users/mahesh/Desktop/therentalcircle/decisions.md) | Decision Records | ✅ `STREAMLINED` | 12 high-impact architectural decisions with rationale and trade-offs. |
| [memory.md](file:///Users/mahesh/Desktop/therentalcircle/memory.md) | System State Ledger | ✅ `ACTIVE` | Living recovery source and checkpoint log. |
| [README.md](file:///Users/mahesh/Desktop/therentalcircle/README.md) | Developer Onboarding | ✅ `UPDATED` | Safe local setup, fake development credentials in `.env.example`. |

---

## 3. Product Slice Progression

| Slice | Product Focus | Status | Next Milestone |
|---|---|---|---|
| **Slice 1: Foundation** | Runnable Skeleton & Docker Environment | `[x] COMPLETED` | All 4 containers healthy, Flyway ran, endpoints verified. |
| **Slice 2: Authentication** | User Registration, JWT & Refresh Session | `[x] COMPLETED & FROZEN` | 16/16 integration tests passed (registration, JWT, rotation, reuse-revocation, concurrent refresh race condition, suspension, logout). |
| **Slice 3: Owner + Property** | Owner Onboarding, Draft Wizard & Photos | `[x] COMPLETED & FROZEN` | 20/20 integration tests passed (declaration, draft CRUD, district, photo upload, magic bytes, orphan-cleanup, IDOR guard, submit lock). |
| **Slice 4: Trust Layer** | Verification Documents & Admin Moderation | `[x] COMPLETED & FROZEN` | 34/34 integration tests passed (private storage isolation, magic bytes, streaming headers, audit logging, 409 conflict, bidirectional LIVE invariant, full KYC + property-doc erasure verified on disk — JPQL LEFT JOIN fix applied). |
| **Slice 5: Discovery** | Search, Filters, MapLibre & SSR Details | `[x] COMPLETED & FROZEN` | 28/28 integration tests passed (JPA multi-predicate search, AND amenity subquery, bounding box, hard cap size, location autocomplete, SSR property detail, address privacy, zero status leakage, MapLibre GL JS + OpenFreeMap stack replacement). |
| **Slice 6: Connection** | WhatsApp, Enquiries, Visits & Favorites | `[x] COMPLETED & FROZEN` | 59/59 integration tests passed (wa.me deep links, contact events, enquiry state machine, visit lifecycle, favorites toggle, in-app notifications). |
| **Slice 7: Trust & Operations**| Reports, Moderation, In-App Notifications | `[x] COMPLETED & FROZEN` | 36/36 integration tests passed (user reports, moderation queues, hide property, suspended property search exclusion, user suspend/restore, admin dashboard metrics, chronological audit log). |
| **Slice 8: Hardening** | E2E Testing, Security Audits & Ship | `[x] COMPLETED & FROZEN` | 28/28 cross-slice E2E journey tests passed, 221/221 total platform regression tests passed (100%), 0 compile/type errors, production build verified. |

---

## 4. Active Checkpoint Log

```text
[CHECKPOINT-20260927-14]
- Timestamp: 2026-09-27T08:52:00+05:30
- Phase: SLICES 1 THROUGH 8 (COMPLETE PLATFORM SHIP READY) 100% VERIFIED & FROZEN
- Status: 100% VERIFIED & FROZEN
- Verification Evidence:
  1. Slice 8 End-to-End User Journey Test Suite (`scripts/test-slice-8-e2e.sh`):
     * Journey A: Owner registration ➔ login ➔ declaration ➔ property draft ➔ JPEG upload (magic bytes) ➔ KYC PDF upload (isolated storage) ➔ submission ➔ admin verification & approval ➔ automated bidirectional LIVE transition.
     * Journey B: Anonymous discovery via structured search (city + locality + amenities AND semantics) ➔ public property details (strict address privacy & status withheld) ➔ tenant registration ➔ authenticated WhatsApp direct contact (wa.me link generation & contact_event log) ➔ structured lead enquiry ➔ owner enquiry status advancement (`CONTACTED`) ➔ visit scheduling & acceptance ➔ favorite bookmark toggle.
     * Journey C: Community reporting (tenant reports property for `BROKER` commission demand) ➔ admin investigation ➔ admin resolution (`HIDE_PROPERTY`) ➔ instant transition to `SUSPENDED` ➔ immediate search quarantine ➔ public detail returns 404 ➔ immutable audit trail logging in `admin_actions`.
     * Journey D: Owner account erasure pipeline (`DELETE /api/v1/owners/account`) ➔ physical KYC and property files confirmed purged from disk (`/var/app/secure-docs/`) ➔ database records, properties, documents, and credentials cascaded.
     * Result: 28/28 assertions passed (100%).
  2. Full Platform Continuous Regression Suite (Slices 8 down to 2):
     * `scripts/test-slice-8-e2e.sh`: 28/28 passed (100%).
     * `scripts/test-slice-7.sh`: 36/36 passed (100%).
     * `scripts/test-slice-6.sh`: 59/59 passed (100%).
     * `scripts/test-slice-5.sh`: 28/28 passed (100%).
     * `scripts/test-slice-4.sh`: 34/34 passed (100%).
     * `scripts/test-slice-3.sh`: 20/20 passed (100%).
     * `scripts/test-slice-2.sh`: 16/16 passed (100%).
     * Grand Total: 221/221 integration assertions passed across all slices (100% zero-regression clean run).
  3. Production Builds & Container Health:
     * Next.js 16 production build (`npm run build`): compiled successfully, all 23 routes static/dynamic generated cleanly.
     * Frontend TypeScript check (`npx tsc --noEmit`): 0 errors.
     * Backend build: Maven clean package withtemurin 21 compiled cleanly.
     * All 4 Docker services healthy: `platform-backend` (8080), `platform-frontend` (3000), `platform-nginx` (80), `platform-postgres` (5432).
  4. Database & Integrity:
     * Migrations V1 through V7 executed cleanly against PostgreSQL 17.11.
     * `V7__reports_foreign_key_cascade.sql` active.
- Platform Status: ALL SLICES COMPLETED, VERIFIED & FROZEN. SHIP READY.
```

```text
[CHECKPOINT-20260927-13]
- Timestamp: 2026-09-27T08:31:00+05:30
- Phase: SLICES 1 THROUGH 7 (Full Product Platform) 100% VERIFIED & FROZEN
- Status: 100% VERIFIED & FROZEN
- Verification Evidence:
  1. Map Stack Modernization (Slice 5):
     * Completely replaced legacy map implementations (Leaflet, Google Maps) with MapLibre GL JS (^6.11.2) + OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`).
     * Zero active references to Leaflet, Google Maps, or Mapbox in frontend application code.
     * OpenFreeMap vector styles configured with compliant, readable attribution.
     * Worker chunks (`maplibre-gl-worker.mjs`, `maplibre-gl-shared.mjs`) automated via `copy-maplibre-worker.mjs` and served under `/maplibre/`.
     * Strict [lng, lat] coordinate order invariant verified across MapLibre instances.
     * Interactive price badges (`formatPriceBadge`: ₹24k, ₹8.2Cr), popups, desktop split layout, mobile List/Map tab switcher, and "Search this area" bounding-box search.
     * The detail map uses a visual privacy-radius representation (350m circle); exact address text remains strictly withheld by the public API.
  2. Search & Discovery Engine (Slice 5):
     * JPA Criteria dynamic specification builder with 12 composable predicates.
     * AND semantics for multi-amenity filtering via Criteria subquery with count matching.
     * Strict bounding-box geographical filtering (`minLat`, `maxLat`, `minLng`, `maxLng`).
     * Pagination with hard cap enforcement (HTTP 400 when size > 50).
     * Prefix-based location autocomplete for cities, districts, localities with minimum length validation.
  3. SSR Property Details & Privacy Protection (Slice 5):
     * Server-side rendered `/properties/[id]` with dynamic OpenGraph meta tags.
     * Strict address privacy: `address` (door/flat/street) completely withheld from public detail API and card summaries.
     * Zero moderation status leakage: non-LIVE properties return HTTP 404 to anonymous users.
     * Verified owner badge indicator based on KYC verification status.
  4. Connections & Lead Management (Slice 6):
     * WhatsApp contact events generating wa.me links without leaking contact info.
     * Enquiry lifecycle (`NEW` -> `CONTACTED` -> `VISIT_SCHEDULED` -> `CLOSED`).
     * Visit scheduling state machine (`REQUESTED` -> `ACCEPTED` -> `RESCHEDULED` -> `CANCELLED`/`COMPLETED`).
     * Favorites toggle and listing API.
     * In-app notification center with read/unread tracking.
  5. Trust & Operations (Slice 7):
     * User report submission and investigation workflow.
     * Property suspension on report resolution (`HIDE_PROPERTY`) with immediate exclusion from search/details.
     * Admin user management (suspend and restore active status).
     * Dashboard operational metrics and append-only audit trail logging.
  6. Automated Full-Platform Regression Run (Slices 7 down to 2 executed sequentially):
     * `scripts/test-slice-7.sh`: 36/36 passed (100%).
     * `scripts/test-slice-6.sh`: 59/59 passed (100%).
     * `scripts/test-slice-5.sh`: 28/28 passed (100%).
     * `scripts/test-slice-4.sh`: 34/34 passed (100%).
     * `scripts/test-slice-3.sh`: 20/20 passed (100%).
     * `scripts/test-slice-2.sh`: 16/16 passed (100%).
     * Total continuous regression suite: 193/193 checks passed (100% zero-regression clean run).
- Next Action: Slice 8 (End-to-End Hardening, Security Audits & Deployment).
```

```text
[CHECKPOINT-20260924-11]
- Timestamp: 2026-09-24T19:08:00+05:30
- Phase: SLICE 4 — Trust Layer (KYC Verification, Private Storage, Retention & Admin Moderation) 100% FROZEN
- Status: 100% VERIFIED & FROZEN
- Verification Evidence:
  1. Database Migration & Constraints:
     * `V4__verification_documents.sql` executed cleanly against PostgreSQL 17.11.
     * Tables `documents` and `admin_actions` created with explicit foreign keys. Canonical 17-table schema strictly preserved.
     * Table `documents` association constraint strictly enforced: `chk_documents_association CHECK (owner_profile_id IS NOT NULL OR property_id IS NOT NULL)`. Verified rejection on orphan insert attempts.
     * `owner_profiles` expanded with `verification_status` ('NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED', 'VERIFIED', 'REJECTED'), `verified_by`, `verified_at`, `admin_remarks` (zero plaintext PAN/Aadhaar columns).
     * `properties` status constraint expanded to include 'MORE_INFORMATION_REQUIRED', 'UNDER_REVIEW', 'APPROVED', 'LIVE', 'REJECTED', 'SUSPENDED'; added `reviewed_by`, `reviewed_at`, `admin_remarks`.
     * Partial unique index `uq_property_primary_image` active on `property_images(property_id) WHERE is_primary = TRUE`.
  2. Private Document Storage Subsystem:
     * Storage volume `/var/app/secure-docs/` is not mapped into Nginx's static serving configuration (confirmed via 404 on direct HTTP requests).
     * 20MB file limit and magic byte inspection (%PDF, JPEG, PNG) strictly enforced.
     * Streaming download via `GET /api/v1/documents/{id}/download` enforcing owner or admin access, with `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `Content-Disposition: attachment`.
     * Sensitive administrative document downloads automatically record append-only audit entries in `admin_actions`.
     * Retention & account erasure pipeline: `OwnerProfileService.deleteOwnerAccount` invoked via `DELETE /api/v1/owners/account` and `DELETE /api/v1/admin/owners/{id}` executes:
       Delete owner account ➔ purge physical KYC files ➔ remove document records ➔ clean property images ➔ remove owner/user data. Verified physical file purged from disk.
  3. Golden Invariant & Deterministic LIVE State Machine:
     * Common transition engine: `attemptTransitionToLive(Property)` strictly enforces that a listing transitions to `LIVE` only when `owner.verificationStatus == VERIFIED AND property.status == APPROVED`.
     * Trigger A verified: Approving an unverified owner's property sets status to `APPROVED`, NOT `LIVE`. Later verifying the owner automatically transitions the property from `APPROVED ➔ LIVE`.
     * Trigger B verified: Verifying an owner first, then approving their property, immediately transitions the property directly to `LIVE`.
  4. Optimistic Concurrency / 409 Conflict Protection:
     * State-conditional updates (`WHERE id = :id AND status IN ('SUBMITTED', 'UNDER_REVIEW')`) prevent concurrent admin decision collisions. Parallel decisions verified with exactly one 200 OK and one 409 Conflict.
  5. Frontend UI:
     * `/owner/verification`: status banners (`MORE_INFORMATION_REQUIRED` alert), document upload dropzone, streaming download, and verification submission button.
     * `/admin/owners` & `/admin/properties`: moderation queues, review drawers with confidential access warnings, Approve/Reject/Request Info modals with mandatory remarks.
     * Verified with 0 TypeScript compilation errors (`npx tsc --noEmit`).
  6. Automated Test Suites:
     * `scripts/test-slice-4.sh`: 33/33 passed (100%).
     * `scripts/test-slice-3.sh`: 20/20 passed (100% - zero regressions).
     * `scripts/test-slice-2.sh`: 16/16 passed (100% - zero regressions).
     * Total regression suite: 69/69 checks passed.
- Next Action: Slice 5 Launch (Discovery & Search / Map / SSR Public Marketplace).
```

```text
[CHECKPOINT-20260924-10]
- Timestamp: 2026-09-24T17:35:00+05:30
- Phase: SLICE 3 — Owner Onboarding & Property Creation COMPLETED
- Status: 100% VERIFIED & FROZEN
- Verification Evidence:
  1. Database Migrations (PostgreSQL 17.11):
     * `V2__owner_profiles.sql`: clean schema without KYC/admin fields (ownership_type, company_name, declaration_accepted, declaration_accepted_at, declaration_version).
     * `V3__property_domain.sql`: `properties` with `district`, check constraint status IN ('DRAFT', 'SUBMITTED'); `property_images` with unique `storage_key`; `property_amenities`.
  2. Owner Onboarding Domain:
     * `POST /api/v1/owners/register`: validates declaration acceptance, assigns `ROLE_OWNER`, prevents duplicate declaration.
     * `GET /api/v1/owners/profile`: secured with `hasRole('OWNER')`.
  3. Property Draft Lifecycle & IDOR Protection:
     * `POST /api/v1/properties`: creates DRAFT property listing.
     * Strict query-boundary isolation: `findByIdAndOwnerProfileUserId` prevents IDOR across owners.
     * `PUT /api/v1/properties/{id}`: updates draft specs and amenities.
     * `PUT /api/v1/properties/{id}/submit`: transitions status DRAFT -> SUBMITTED only if required fields and photos exist; permanently locks property from further owner edits or deletions.
  4. Public Photo Upload Subsystem:
     * Validates 10MB limit and magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: RIFF...WEBP).
     * Serves statically through Nginx `/uploads/*` alias.
     * Orphan-file cleanup: catches DB errors and deletes physical file immediately; deleting an image removes both DB row and disk file.
  5. Frontend UI (Next.js 16 App Router):
     * `/owner/become-owner`: legal declaration and ownership type selector.
     * `/owner/dashboard`: owner stats and quick links.
     * `/owner/properties/new`: 5-step stepper creation wizard.
     * `/owner/properties`: owner listings management table.
     * Fully compiled with zero TypeScript errors (`npx tsc --noEmit`).
  6. Automated Test Suites:
     * `scripts/test-slice-3.sh`: 20/20 checks passed (100%).
     * `scripts/test-slice-2.sh`: 16/16 checks passed (100% - zero regressions).
- Next Action: Slice 4 Planning & Verification/Moderation Architecture.
```

```text
[CHECKPOINT-20260924-09]
- Timestamp: 2026-09-24T16:42:00+05:30
- Phase: SLICE 2 — Hardening Pass & Formal Freezing COMPLETED
- Status: 100% VERIFIED & FROZEN
- Verification Evidence:
  1. Dependency Modernization:
     * JJWT upgraded to version 0.13.0 (`io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson`) in `backend/pom.xml`.
     * Verified Spring Security is not hardcoded and is cleanly managed by Spring Boot 4.1.1 (providing Spring Security 7.1.1).
  2. Technical Brand Sanitization:
     * Removed all product branding ("RentalCircle") from test scripts and temporary paths (`scripts/test-slice-2.sh`, `/tmp/platform-test-slice2-*`).
     * Confirmed 0 occurrences of product name in technical execution paths.
  3. Race Condition Invariant Verified:
     * Added Concurrent Refresh Token Race Condition test to `scripts/test-slice-2.sh`.
     * Two concurrent requests presenting the exact same refresh token simultaneously resulted in exactly one HTTP 200 OK and one HTTP 401 Unauthorized rejection.
  4. End-to-End Test Suite Execution (`scripts/test-slice-2.sh`):
     * Total Checks Executed: 16
     * Total Checks Passed:   16 (100%)
     * Total Checks Failed:   0
  5. Slice Status:
     * Slice 2 is formally verified and FROZEN. Zero further edits needed.
- Next Action: Slice 3 Planning & Owner/Property Onboarding Architecture.
```

```text
[CHECKPOINT-20260924-08]
- Timestamp: 2026-09-24T15:58:00+05:30
- Phase: SLICE 2 — Authentication & User Identity COMPLETED
- Status: 100% VERIFIED & OPERATIONAL
- Verification Evidence:
  1. Database Migration:
     * Flyway executed `V1__auth_and_users.sql` cleanly to schema "public", now at version v1.
     * Database contains exactly 4 canonical tables: `roles`, `users`, `user_roles`, `refresh_tokens`.
     * `roles` seeded with `ROLE_USER`, `ROLE_OWNER`, `ROLE_ADMIN`.
  2. Multi-Agent Specialist Delivery:
     * Database Architect: `V1__auth_and_users.sql`.
     * Session Specialist: `RefreshToken` entity, repository, and service with SHA-256 hashing.
     * Backend Auth Specialist: Spring Security 6 stateless filter chain, `JwtTokenProvider`, `JwtAuthenticationFilter`, `AuthController`, and DTOs.
     * Frontend Specialist: `api-client.ts` Axios interceptor with in-memory JWT & automatic 401 refresh, `auth-context.tsx`, and `/login` & `/register` editorial pages.
     * QA Specialist: `scripts/test-slice-2.sh`.
  3. Lead Integration & Fixes:
     * Resolved transaction rollback isolation: configured `@Transactional(noRollbackFor = TokenRefreshException.class)` to commit session revocation on theft/reuse detection.
     * Fixed proxy detachment: added `JOIN FETCH` to `RefreshTokenRepository.findByTokenHash` to eliminate `LazyInitializationException`.
  4. End-to-End Automated Test Results (`scripts/test-slice-2.sh`):
     * Total Checks Executed: 15
     * Total Checks Passed:   15 (100%)
     * Total Checks Failed:   0
     * Tests verified:
       - User registration (201 Created)
       - User login with credentials (200 OK)
       - Access JWT in JSON body & Refresh cookie in HttpOnly, Secure, SameSite=Lax flags
       - Protected `/api/v1/auth/me` with Bearer token (200 OK)
       - Unauthorized request rejection (401 Unauthorized)
       - Session refresh & rotation (new JWT issued, refresh cookie rotated)
       - Old refresh token rejection (401 Unauthorized)
       - Token family revocation: active session revoked upon old token reuse attempt
       - User suspension rejection: DB `is_active=false` live check blocks `/me` and `/refresh`
       - User restoration: operations resume when `is_active=true`
       - Logout: cookie cleared (`Max-Age=0`), token revoked in DB
  5. Frontend SSR Verification:
     * `curl http://localhost/login` -> 200 OK
     * `curl http://localhost/register` -> 200 OK
- Next Action: Ready for Slice 3 (Owner Onboarding & Property Creation).
```
- Timestamp: 2026-09-24T14:43:00+05:30
- Phase: SLICE 1 — Foundation Audit, Cleanup & Zero-Brand Locking COMPLETED
- Status: 100% CLEAN & VERIFIED
- Audit Resolutions Verified:
  1. Flyway Auto-Configuration Restored:
     * Added official `org.springframework.boot:spring-boot-starter-flyway` to `pom.xml`.
     * Deleted suspicious `FlywayConfig.java`. Spring Boot 4's native `FlywayMigrationInitializer` and `FlywayAutoConfiguration` run cleanly out of the box.
  2. 17-Domain-Table Invariant Preserved:
     * Deleted ephemeral `V0__init.sql` and `platform_system_info`.
     * Zero spurious application tables in database. Schema starts cleanly with V1–V6.
     * `flyway_schema_history` table initialized and ready for `V1__auth_and_users.sql`.
  3. Technical Identifiers Brand-Free:
     * Docker compose project set to `name: platform`.
     * Docker image tags locked to `platform-backend:latest`, `platform-frontend:latest`, `platform-nginx:latest`.
     * Database name locked to `dev_platform` across `.env`, `docker-compose.yml`, `application.yml`, and `application-docker.yml`.
     * Robots.txt header updated to `# Platform Robots`.
  4. Git Repository Integrity:
     * Confirmed single clean root commit `a605660`.
  5. Genuine Clean Rebuild (`docker compose down -v` -> `docker compose up -d --build`):
     * `platform-postgres` (PostgreSQL 17.11): Healthy, database `dev_platform`.
     * `platform-backend` (Spring Boot 4.1.1 on Java 21 LTS): Healthy, port 8080.
     * `platform-frontend` (Next.js 16.3.6 standalone on Node 24): Healthy, port 3000.
     * `platform-nginx` (Nginx 1.30.5): Healthy, port 80.
     * `curl -i http://localhost/api/health` -> HTTP 200 OK
     * `curl -s -o /dev/null -w "%{http_code}\n" http://localhost/` -> HTTP 200 OK
     * `docker exec platform-postgres psql -U dev_user -d dev_platform -c "\dt"` -> Only `flyway_schema_history` (0 application tables).
  6. Subagent Model Locked for Slice 2:
     * Parallel specialists + sequential integration (DB specialist, Backend Auth specialist, Session specialist, Frontend specialist, QA specialist) with strict file ownership. Single lead integrator merges, tests, and reviews.
- Next Action: Slice 1 is 100% frozen. Ready to plan and execute Slice 2 contract.
```

---

## 5. Genuinely Unresolved Open Decisions

The following 5 decisions remain open for product/business clarification:
1. **Public Property Address Precision**: Whether public unauthenticated visitors view the exact door/building number or only the locality/street level prior to verified login.
2. **WhatsApp Direct Redirect vs. Verification Landing**: Direct redirect to `wa.me/<owner_number>` vs. displaying an intermediate trust modal confirming verified user status.
3. **Owner Document Redaction / Retention Policy**: Post-verification data lifecycle and redaction rules for government identity documents (PAN / Aadhaar).
4. **User Dual-Role Capability**: Whether a single registered user account can dynamically switch between tenant/buyer mode and owner mode under one identity, or whether a role-switch UI is required.
5. **Mandatory Contact Prerequisite**: Whether mobile phone verification (via SMS OTP) should be a hard prerequisite for user registration or deferred until the first contact/visit action.
