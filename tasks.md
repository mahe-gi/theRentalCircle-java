# RentalCircle — Master Implementation Roadmap (tasks.md)

> **Document Status**: `CANONICAL EXECUTION ROADMAP`  
> **Version**: 2.0 (Product-Driven Vertical Slices)  
> **Related Documents**: [prd.md](file:///Users/mahesh/Desktop/therentalcircle/prd.md) | [architecture.md](file:///Users/mahesh/Desktop/therentalcircle/architecture.md) | [decisions.md](file:///Users/mahesh/Desktop/therentalcircle/decisions.md) | [memory.md](file:///Users/mahesh/Desktop/therentalcircle/memory.md)

---

## 1. Operating Principles & Execution Invariants

1. **Vertical Slices Over Technical Layers**: Development progresses by shipping complete, usable vertical slices of the product journey rather than disconnected horizontal technical layers.
2. **Definition of Done (DoD)**:
   * Implementation code exists and compiles without errors.
   * The intended product user journey works end-to-end.
   * Unit and integration test suites pass with zero failures.
   * Security, authorization, and file validation rules pass.
   * Verification command is executed and confirmed with clean output.
   * [memory.md](file:///Users/mahesh/Desktop/therentalcircle/memory.md) is updated with the current state.
3. **No Speculative Completion**: A task is **NEVER** marked `[x] COMPLETED` from code generation or intent alone. It requires running the verification command and inspecting output.
4. **Agent Roles & Single-Writer Rule**:
   * *Lead Orchestrator*: Overall state tracking in `memory.md`, cross-slice validation.
   * *Database Specialist*: Flyway SQL migrations (`V1` to `V6`), schema constraints, indexes.
   * *Backend Specialist*: Spring Boot modular monolith (`com.platform.*`), controllers, services, security.
   * *Frontend Specialist*: Next.js 16 App Router, Tailwind tokens, TanStack Query, Leaflet maps.
   * *QA & Security Specialist*: Automated integration testing, security audit, regression verification.
   * *Single-Writer Constraint*: Only one agent may modify a given bounded code area at a time.

### Standardized Status Vocabulary
* `[ ] TODO`: Task identified; work has not begun.
* `[~] IN PROGRESS`: Task actively being executed.
* `[x] COMPLETED`: Task verified working via real command execution with zero errors.
* `[!] BLOCKED`: Task halted due to external blocker or missing prerequisite.
* `[?] NEEDS DECISION`: Task pending product clarification before execution.
* `[-] CANCELLED`: Task formally removed from scope.

---

## 2. Vertical Product Slices Roadmap

```text
SLICE 1: Foundation ────────► SLICE 2: Authentication ────► SLICE 3: Owner + Property
(Boot, DB, Nginx, Docker)    (Register, Login, Session)   (Owner profile, Draft, Photos)
                                                                 │
                                                                 ▼
SLICE 6: Connection ◄──────── SLICE 5: Discovery ◄───────── SLICE 4: Trust Layer
(WhatsApp, Enquiry, Visit)   (Search, Map, Detail View)    (Docs, Owner KYC, Property Approval)
      │
      ▼
SLICE 7: Trust & Operations ─► SLICE 8: Hardening & Ship
(Reports, Admin, Audit)       (E2E Journey, Security, Verify)
```

---

### SLICE 1 — Foundation (Runnable Skeleton & Environment)
* **Product Capability**: Development environment boots reliably with a single command; database migrations run cleanly; proxy routes correctly to backend and frontend; real end-to-end connectivity is demonstrated.
* **Why We Need It**: Eliminates environment drift and proves real running software: fresh dependency resolution, Spring Boot 4.1.1 boots on Java 21 LTS (`eclipse-temurin:21-jre-jammy`), PostgreSQL 17.11 starts, Flyway executes, Next.js 16.x (16.3.6, React 19.x compatible, Node 24.21.0 LTS) starts, and backend ↔ database ↔ frontend connectivity is verified live.
* **User Journey Unlocked**: Infrastructure baseline for all user flows.

#### Tasks:
- [x] **TASK-101**: Scaffold repository root layout (`docker-compose.yml`, `.env.example`, `backend/`, `frontend/`, `nginx/`).
- [x] **TASK-102**: Configure `docker-compose.yml` with services: `postgres` (port 5432, image `postgres:17.11-alpine`), `backend` (port 8080), `frontend` (port 3000), `nginx` (port 80, image `nginx:1.30-alpine`), and volumes `uploads_data`, `secure_docs_data`, `postgres_data`.
- [x] **TASK-103**: Initialize Spring Boot 4.1.1 backend on Java 21 LTS under base package `com.platform.*` with Maven dependencies (`web`, `security`, `data-jpa`, `validation`, `flyway`, `postgresql`, `lombok`).
- [x] **TASK-104**: Initialize Next.js 16.x (16.3.6) frontend on React 19.x compatible / Node 24.21.0 LTS with TypeScript, Tailwind CSS, and Axios.
- [x] **TASK-105**: Configure Nginx ingress (`/api/*` → backend:8080, `/*` → frontend:3000, `/uploads/*` → `/var/app/uploads`).

#### Verification:
```bash
docker compose up -d --build
curl -f http://localhost/api/health
curl -f http://localhost/
```
*Criteria*: All 4 containers healthy; Spring Boot connects to PostgreSQL; Next.js SSR serves root HTML; Nginx proxies frontend and backend cleanly.

---

### SLICE 2 — Authentication & User Identity
* **Product Capability**: Users (tenants and buyers) can register an account, log in securely, receive a short-lived access JWT, maintain an active session via an HttpOnly refresh cookie, and log out.
* **Why We Need It**: The zero-broker marketplace requires verified, authenticated identities to prevent anonymous spam and broker harvesting.
* **User Journey Unlocked**: Account creation, authenticated sessions, profile management.

#### Tasks:
- [x] **TASK-201**: Write Flyway migration `V1__auth_and_users.sql` (`users`, `roles`, `user_roles`, `refresh_tokens`).
- [x] **TASK-202**: Implement Spring Security 6 filter chain, `JwtTokenProvider`, and stateless access JWT validation.
- [x] **TASK-203**: Implement `RefreshTokenService` with SHA-256 token hashing, database persistence, rotation, and strict reuse detection (revoking all sessions on reuse).
- [x] **TASK-204**: Implement `AuthController`:
  * `POST /api/v1/auth/register` (BCrypt password hash, default `ROLE_USER`).
  * `POST /api/v1/auth/login` (Returns access JWT in JSON, sets refresh token in `HttpOnly; Secure; SameSite=Lax` cookie).
  * `POST /api/v1/auth/refresh` (Rotates refresh token in DB and cookie, returns new access JWT).
  * `POST /api/v1/auth/logout` (Revokes refresh token in DB, clears cookie).
  * `GET /api/v1/auth/me` (Returns authenticated user profile).
- [x] **TASK-205**: Implement `GlobalExceptionHandler` with standardized `ApiResponse<T>` / `ErrorResponse`.
- [x] **TASK-206**: Implement frontend client auth:
  * `src/lib/api-client.ts` with Axios request interceptor (attaches in-memory JWT) and response interceptor (automatic 401 refresh call).
  * Auth pages (`app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`).
- [x] **TASK-207**: Hardening pass:
  * Upgraded `jjwt.version` to `0.13.0` in `backend/pom.xml`.
  * Verified Spring Security 7.1.1 is managed cleanly via Spring Boot 4.1.1 parent.
  * Added Concurrent Refresh Token Race Condition test to test suite (asserting exactly one 200 and one 401).
  * Sanitized product branding in technical scripts and temp directories.
  * Rebuilt backend container and verified 16/16 tests passing (100%).

#### Verification:
```bash
bash scripts/test-slice-2.sh
```
*Criteria*: All 16 security and authentication integration tests pass (100%), including concurrent refresh token race condition and theft reuse family revocation. Slice 2 is 100% frozen.

---

### SLICE 3 — Owner Onboarding & Property Creation
* **Product Capability**: A registered user can declare themselves an owner (or authorized representative), access the Owner Portal, create a property listing in `DRAFT` status, edit specifications, upload photos, and submit the listing for moderation.
* **Why We Need It**: Owners must be able to list residential or commercial properties easily for free without broker friction.
* **User Journey Unlocked**: Owner onboarding, multi-step property listing wizard, photo upload.

#### Tasks:
- [ ] **TASK-301**: Write Flyway migrations `V2__owner_profiles.sql` (`owner_profiles`) and `V4__property_domain.sql` (`properties`, `property_images`, `property_amenities`).
- [ ] **TASK-302**: Implement `OwnerController`:
  * `POST /api/v1/owners/register` (Adds `ROLE_OWNER`, creates `owner_profiles` record with status `NOT_STARTED`).
  * `GET /api/v1/owners/profile` (Returns current owner profile and verification status).
- [ ] **TASK-303**: Implement `PropertyService` and `PropertyController`:
  * `POST /api/v1/properties` (Creates property in `DRAFT` status; owner only).
  * `PUT /api/v1/properties/{id}` (Updates draft property; validates ownership chain: `property.ownerProfile.user.id == currentUser.id`).
  * `PUT /api/v1/properties/{id}/submit` (Transitions `DRAFT → SUBMITTED`; validates required fields and coordinates).
  * `GET /api/v1/properties/my` (Lists owner's properties with status filter).
- [ ] **TASK-304**: Implement public photo upload service (`PropertyImageService`):
  * Stores images in `/var/app/uploads/properties/` with UUID filenames and magic-byte validation.
  * Served directly by Nginx at `/uploads/*`.
- [ ] **TASK-305**: Frontend Owner Portal UI:
  * Owner declaration flow (`app/owner/become-owner/page.tsx`).
  * Multi-step property listing wizard (`app/owner/properties/new/page.tsx`).
  * Owner properties management table (`app/owner/properties/page.tsx`).

#### Verification:
```bash
cd backend && ./mvnw test -Dtest=PropertyLifecycleTest,PropertyImageServiceTest
```
*Criteria*: Owner can register, draft a property, upload photos, and submit for review. Property cannot be edited by other users.

---

### SLICE 4 — Trust Layer (Verification & Moderation)
* **Product Capability**: Owners can upload private verification documents (Aadhaar, PAN, title deeds); administrators inspect KYC docs and property details, approving or rejecting them; properties become `LIVE` only when both owner is verified and property is approved.
* **Why We Need It**: Enforces RentalCircle's zero-broker policy and keeps the platform trustworthy.
* **User Journey Unlocked**: Owner KYC submission, Admin review queues, Property transitioning to `LIVE`.

#### Tasks:
- [ ] **TASK-401**: Write Flyway migration `V3__verification_documents.sql` (`documents`, `verification_requests`).
- [ ] **TASK-402**: Implement private document storage service (`FileStorageService`):
  * Stores private docs in `/var/app/secure-docs/` (unmapped in Nginx).
  * Enforces the 9 file security rules (never trust client filename/MIME, magic-byte check, whitelist, UUID filenames).
  * Streaming download endpoint `GET /api/v1/documents/{id}/download` requiring owner or admin authorization.
- [ ] **TASK-403**: Implement owner verification submission:
  * `POST /api/v1/owners/verification/submit` (Transitions status `NOT_STARTED → SUBMITTED`).
- [ ] **TASK-404**: Implement Admin Moderation endpoints:
  * `GET /api/v1/admin/owners` & `PUT /api/v1/admin/owners/{id}/verify` (Sets owner status `VERIFIED`).
  * `GET /api/v1/admin/properties` & `PUT /api/v1/admin/properties/{id}/approve` (Enforces live invariant: property transitions to `LIVE` only if owner is `VERIFIED`).
  * Rejection and Request Info endpoints with mandatory admin remarks.
- [ ] **TASK-405**: Frontend Admin Console UI:
  * Owner verification review queue (`app/admin/owners/page.tsx`).
  * Property listing moderation queue (`app/admin/properties/page.tsx`).

#### Verification:
```bash
cd backend && ./mvnw test -Dtest=OwnerVerificationTest,AdminModerationTest
```
*Criteria*: Private documents inaccessible via Nginx; property cannot transition to `LIVE` if owner is unverified; approved property of verified owner transitions to `LIVE`.

---

### SLICE 5 — Discovery (Search, Filters, Map & Details)
* **Product Capability**: Anyone can search live properties across Indian cities/localities with filters (Buy/Rent, Residential/Commercial, Price, BHK, Furnishing), explore pins on an interactive Leaflet map, and view property details.
* **Why We Need It**: Discovery is the marketplace core where tenants and buyers find genuine homes.
* **User Journey Unlocked**: Public search, interactive map exploration, property details SSR view.

#### Tasks:
- [ ] **TASK-501**: Implement `SearchService` using Spring Data JPA specifications:
  * Filtering on `city`, `locality`, `listingType`, `propertyType`, `price`, `bhk`, `furnishing`, `amenities`.
  * Map viewport bounding-box queries (`lat BETWEEN :minLat AND :maxLat`).
  * Strict invariant: Only properties with `status = 'LIVE'` are returned.
- [ ] **TASK-502**: Implement `GET /api/v1/properties/search/locations` (City/locality autocomplete).
- [ ] **TASK-503**: Frontend Public Search Page (`app/properties/page.tsx`):
  * Dual-pane layout: Listing feed on left, interactive Leaflet map on right.
  * Map pins synced with listing card hover states.
  * Filter panel with instant TanStack Query updates.
- [ ] **TASK-504**: Frontend Property Details Page (`app/properties/[id]/page.tsx`):
  * Rendered via Next.js SSR for full Google SEO and OpenGraph preview cards.
  * Photo gallery modal, specifications grid, verified owner badge, and interactive location map.

#### Verification:
```bash
cd backend && ./mvnw test -Dtest=PropertySearchTest
```
*Criteria*: Search returns only `LIVE` properties; map renders pins accurately; SSR property detail renders semantic HTML with zero auth tokens required.

---

### SLICE 6 — Connection (WhatsApp, Enquiries, Visits & Favorites)
* **Product Capability**: Registered users can bookmark properties, submit structured enquiries, schedule site visits, and connect directly with verified owners on WhatsApp with pre-filled property details.
* **Why We Need It**: Connects genuine property seekers directly with owners with zero broker fees.
* **User Journey Unlocked**: Direct WhatsApp contact, booking visits, managing leads, saving favorites.

#### Tasks:
- [ ] **TASK-601**: Write Flyway migration `V5__connections.sql` (`contact_events`, `enquiries`, `visits`, `favorites`).
- [ ] **TASK-602**: Implement `ContactController`:
  * `POST /api/v1/properties/{id}/contact` (Requires login; logs `contact_events` record; returns pre-populated `https://wa.me/...` URL).
- [ ] **TASK-603**: Implement `EnquiryController`:
  * `POST /api/v1/properties/{id}/enquiries` (User sends structured lead message).
  * `GET /api/v1/enquiries/my` (User's sent enquiries) & `GET /api/v1/enquiries/received` (Owner's received enquiries).
  * `PUT /api/v1/enquiries/{id}/status` (Owner updates status: `CONTACTED`, `VISIT_SCHEDULED`, `CLOSED`).
- [ ] **TASK-604**: Implement `VisitController`:
  * `POST /api/v1/properties/{id}/visits` (User requests visit with date, time, message).
  * `PUT /api/v1/visits/{id}/accept`, `reject`, `reschedule`, `complete`.
- [ ] **TASK-605**: Implement `FavoriteController`:
  * `POST /api/v1/properties/{id}/favorite` (Toggle bookmark) & `GET /api/v1/favorites`.
- [ ] **TASK-606**: Frontend Connection UI:
  * WhatsApp CTA button (`whatsapp-button.tsx`).
  * Enquiry modal and Visit scheduling modal on Property Details page.
  * User dashboard tabs for Favorites, Enquiries, and Visits.

#### Verification:
```bash
cd backend && ./mvnw test -Dtest=ConnectionWorkflowsTest
```
*Criteria*: WhatsApp click logs audit event; visit request status lifecycle functions cleanly; enquiry lead pipeline tracks progress.

---

### SLICE 7 — Trust & Operations (Reports, Moderation & Notifications)
* **Product Capability**: Users can report suspicious listings or brokers; administrators investigate and resolve reports (with warnings or suspensions); in-app notification center alerts users to visit updates or approvals; all admin actions produce append-only administrative audit records.
* **Why We Need It**: Keeps the marketplace safe from broker infiltration, spam, and fraud.
* **User Journey Unlocked**: Reporting suspicious listings, admin investigation, notification alerts.

#### Tasks:
- [ ] **TASK-701**: Write Flyway migration `V6__trust_and_operations.sql` (`reports`, `notifications`, `admin_actions`).
- [ ] **TASK-702**: Implement `ReportController`:
  * `POST /api/v1/reports` (User reports listing or user for `BROKER`, `SPAM`, `FAKE_PROPERTY`, etc.).
  * `GET /api/v1/reports/my`.
- [ ] **TASK-703**: Implement Admin Report Investigation & Resolution:
  * `GET /api/v1/admin/reports` (Open investigation queue).
  * `PUT /api/v1/admin/reports/{id}/resolve` (Admin action: `WARN`, `HIDE_PROPERTY`, `SUSPEND_USER`, `BLOCK_USER`).
- [ ] **TASK-704**: Implement `AdminAuditService` logging append-only entries in `admin_actions` with restricted access.
- [ ] **TASK-705**: Implement `NotificationService`:
  * Transactional in-app notification creation for key events (property approved, visit scheduled, enquiry received).
  * `GET /api/v1/notifications` (Paged list, unread filter) & `PUT /api/v1/notifications/{id}/read`.
  * Optional non-blocking `@Async` email dispatch wrapped in try-catch outside the transaction.
- [ ] **TASK-706**: Frontend Admin Reports & Notifications UI:
  * Header notification bell with badge counter.
  * Admin report resolution queue (`app/admin/reports/page.tsx`).
  * Admin audit logs view (`app/admin/audit-logs/page.tsx`).

#### Verification:
```bash
cd backend && ./mvnw test -Dtest=ReportAndAuditIntegrationTest
```
*Criteria*: Suspicious property can be reported and suspended by admin; in-app notification appears immediately; audit log records action in append-only administrative ledger.

---

### SLICE 8 — Hardening, E2E Journey Testing & Ship
* **Product Capability**: Full end-to-end integration test runs cleanly; security scans confirm zero authorization leaks; production build succeeds with zero compile/type errors.
* **Why We Need It**: Guarantees production readiness and verified platform quality.
* **User Journey Unlocked**: Complete, reliable marketplace experience from discovery to connection.

#### Tasks:
- [ ] **TASK-801**: Execute comprehensive backend integration test suite (`./mvnw clean verify`).
- [ ] **TASK-802**: Execute frontend production build and type checking (`npm run build`, `npm run lint`).
- [ ] **TASK-803**: Run automated end-to-end user journey test script:
  * Tenant searches property → views details → clicks WhatsApp.
  * Owner onboard → drafts property → uploads KYC → admin verifies → property goes LIVE.
  * User reports listing → admin suspends listing.
- [ ] **TASK-804**: Validate Docker Compose orchestration (`docker compose up -d`) and clean startup logs.

#### Verification:
```bash
cd backend && ./mvnw clean verify
cd frontend && npm run build
docker compose up -d
curl -f http://localhost/
```
*Criteria*: 100% tests pass, 0 compile errors, end-to-end marketplace journeys verified operational.
