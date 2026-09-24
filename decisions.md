# RentalCircle — Technical Decisions Record (decisions.md)

> **Document Status**: `CANONICAL DECISION RECORD`  
> **Version**: 2.0 (High-Impact Architectural Decisions)  
> **Related Documents**: [prd.md](file:///Users/mahesh/Desktop/therentalcircle/prd.md) | [architecture.md](file:///Users/mahesh/Desktop/therentalcircle/architecture.md) | [tasks.md](file:///Users/mahesh/Desktop/therentalcircle/tasks.md)

---

## 1. Change Management Protocol

Every decision recorded here governs technical and architectural implementation for RentalCircle. Decisions are tagged with one of four statuses:
* `LOCKED`: Fixed architectural decision for MVP-0.
* `PROPOSED`: Under evaluation; requires human reviewer sign-off prior to implementation.
* `OPEN`: Deliberately deferred or awaiting product clarification.
* `SUPERSEDED`: Replaced by a newer decision.

### Modification Rule for Locked Decisions
If an engineer or AI agent discovers that a `LOCKED` decision cannot be implemented or introduces a critical bug, they **must not silently change the code or document**. Instead, they must record the problem discovered, proposed alternative, and impact, and halt for human review.

---

## 2. Canonical Architectural Decisions

### DEC-01: Modular Monolith Architecture (No Microservices)
* **Decision**: Implement the backend as a single, modular Spring Boot 4.1.1 monolith on Java 21 LTS organized by domain packages (`com.platform.<module>`).
* **Why We Need It**: To eliminate distributed systems complexity (network latency, circuit breakers, distributed 2PC transactions, eventual consistency bugs) while maintaining clean domain boundaries on a modern, fully supported 2026 Spring Boot foundation.
* **Alternatives Considered**: Microservices (rejected due to unjustifiable operational overhead for an MVP-0 team).
* **Implementation**: Packaged under `com.platform.*` with direct Spring service injection across modules.
* **Trade-offs**: Gains fast development, single JVM deployment, and transactional consistency; requires deploying the whole application together.
* **Status**: `LOCKED`

---

### DEC-02: PostgreSQL as Single Relational Store
* **Decision**: Use PostgreSQL 17.11 as the single database for all entities, sessions, and append-only administrative audit records.
* **Why We Need It**: RentalCircle's data model is deeply relational: Users have OwnerProfiles; Owners list Properties; Properties have Photos, Enquiries, Visits, and Reports; Admins log auditable Actions. PostgreSQL 17.11 represents the current recommended stable minor release.
* **Alternatives Considered**: MongoDB (rejected because denormalizing relational real-estate data creates update anomalies and risks broker bypass); PostgreSQL 16 (rejected in favor of the current active 17.x LTS line).
* **Implementation**: Normalized into 17 tables with strict foreign keys and composite B-tree indexes.
* **Trade-offs**: Uncompromising transactional integrity; schema changes require versioned SQL migrations.
* **Status**: `LOCKED`

---

### DEC-03: Spring Data JPA & Phased Flyway Migrations
* **Decision**: Manage database schema changes using Flyway (managed via Spring Boot 4.1) with 6 domain-aligned migrations (`V1` through `V6`), with Hibernate configured to `ddl-auto: validate`.
* **Why We Need It**: Prevents runtime Hibernate schema mutations and provides deterministic schema evolution across all development and production environments.
* **Alternatives Considered**: A single giant migration script (rejected to align migrations with vertical product slices); Hibernate `ddl-auto: update` (rejected as dangerous).
* **Implementation**: `backend/src/main/resources/db/migration/V1__...` through `V6__...`.
* **Trade-offs**: 100% reproducible database history; every schema change requires writing a migration script before updating Java entities.
* **Status**: `LOCKED`

---

### DEC-04: Dual-Token Authentication (JWT + Revocable Refresh Tokens in DB)
* **Decision**: Use a short-lived access JWT (15-min) held in client memory, paired with a long-lived refresh token (7-day) stored as a SHA-256 hash in PostgreSQL and delivered via an `HttpOnly, Secure, SameSite=Lax` cookie.
* **Why We Need It**: Combines stateless token validation for routine queries with server-side revocation on logout, user suspension, or refresh token reuse.
* **Alternatives Considered**: Redis sessions (rejected to avoid an extra infrastructure service); single long-lived JWT (rejected because compromised tokens cannot be revoked).
* **Implementation**:
  * **Database-Level Atomic Rotation**: A frontend Axios mutex cannot prevent cross-tab or concurrent request races. Rotation and reuse detection execute atomically in PostgreSQL:
    ```sql
    UPDATE refresh_tokens
    SET revoked_at = NOW(), replaced_by = :newTokenHash
    WHERE id = :id AND revoked_at IS NULL AND expires_at > NOW();
    ```
    If `rowsUpdated == 0`, concurrent rotation or token reuse has occurred; the server immediately revokes ALL active refresh tokens for the user account (`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = :userId`), clears the cookie, logs an administrative security alert, and forces full re-authentication.
  * **Access-JWT Suspension Semantics**: Refresh-session revocation prevents renewal. Already-issued access JWTs remain valid until expiry (15 minutes) unless the request path performs a live account-status check. For MVP-0, routine public searches and read queries remain completely stateless for maximum speed. For critical state-mutating operations (property submissions, listing status changes, and moderation actions), the service layer validates `user.isActive()` against the database, preventing suspended users from mutating state even during the short 15-minute token expiry window.
* **Trade-offs**: Resilient session security with zero distributed cache overhead; requires client refresh interceptor handling.
* **Status**: `LOCKED`

---

### DEC-05: Next.js 16.x Active LTS App Router with React 19.x (Hybrid SSR & Client-Side Dashboards)
* **Decision**: Use Next.js 16.x Active LTS (specifically Next.js 16.3.6) App Router with compatible React 19.x on Node.js 24.21.0 LTS, utilizing Server-Side Rendering (SSR) for public marketplace pages, and Client-Side Rendering (CSR) for authenticated dashboards.
* **Why We Need It**: Public property pages demand fast initial paint and OpenGraph SEO previews for Google indexing and WhatsApp cards. Authenticated dashboards handle private, dynamic state that search engines should not crawl. Next.js 16.x is the Active LTS line. React 19.x compatibility is resolved deterministically by the package manager for Next.js 16 and locked in `package-lock.json` rather than hardcoding arbitrary peer dependency patch numbers in architecture documents.
* **Alternatives Considered**: Single Page App / Vite (rejected due to zero native SEO); Full SSR for dashboards (rejected to avoid server-side session stores or BFF overhead).
* **Implementation**: Public pages (`app/properties/*`) use Server Components without auth tokens. Dashboards (`app/owner/*`, `app/admin/*`, `app/(dashboard)/*`) use Client Components with Axios interceptors and TanStack Query.
* **Trade-offs**: Optimal SEO and simple client token management; requires discipline respecting the SSR vs. Client Component boundary.
* **Status**: `LOCKED`

---

### DEC-06: Local Filesystem Storage via Docker Persistent Volumes
* **Decision**: Store uploaded files on the local filesystem mounted via Docker volumes, partitioned into public property images (`/var/app/uploads`) and private owner documents (`/var/app/secure-docs`).
* **Why We Need It**: Provides immediate, zero-friction file storage without external cloud credentials, billing setup, or complex MinIO configurations during MVP-0.
* **Alternatives Considered**: AWS S3 / Cloudflare R2 (deferred to multi-instance cloud deployment); MinIO container (rejected as unnecessary memory overhead).
* **Implementation**: Public volume `uploads_data` mounted in Nginx for static read-only serving; private volume `secure_docs_data` mounted strictly in Spring Boot for authenticated streaming.
* **Trade-offs**: Zero cloud dependencies; storage capacity is bound to host disk space (suitable for MVP-0 single-server scale).
* **Status**: `LOCKED`

---

### DEC-07: Leaflet.js with OpenStreetMap-Compatible Tiles
* **Decision**: Use Leaflet.js with OpenStreetMap-compatible tiles for interactive property map display and location pin-picking.
* **Why We Need It**: Eliminates mandatory third-party map billing accounts (e.g., Google Maps JavaScript API) and per-load fee risks during MVP-0.
* **Alternatives Considered**: Google Maps API (rejected due to billing setup and per-request costs); Mapbox GL JS (rejected due to proprietary API keys).
* **Implementation**: Dynamic client-side React component with standard OSM tile URL. Usage complies with provider attribution and rate-limit policies.
* **Trade-offs**: Free open-source map ecosystem; requires respecting tile provider acceptable use policies.
* **Status**: `LOCKED`

---

### DEC-08: Standard WhatsApp Deep Links (No WhatsApp Business API)
* **Decision**: Enable direct owner contact via standard `https://wa.me/<owner_number>?text=...` deep links triggered from verified user accounts.
* **Why We Need It**: Accomplishes the core product goal of zero-brokerage direct communication instantly, natively, and with zero Meta conversation API fees.
* **Alternatives Considered**: Meta WhatsApp Business Cloud API (rejected due to per-conversation fees, template approval delays, and complex webhook infrastructure).
* **Implementation**: Endpoint `POST /api/v1/properties/{id}/contact` verifies user authentication, logs a `contact_events` audit record, and returns the pre-filled `wa.me` URL.
* **Trade-offs**: Direct native user connection; platform cannot inspect private messages once transitioned to WhatsApp.
* **Status**: `LOCKED`

---

### DEC-09: Structured Form Enquiries (No Real-Time In-App Chat)
* **Decision**: Implement enquiries as structured, one-way submissions with explicit lifecycle state transitions (`NEW → CONTACTED → VISIT_SCHEDULED → CLOSED`).
* **Why We Need It**: Real-time chat is explicitly out of scope for MVP-0 per `prd.md`. Structured enquiries provide owners with a clean lead pipeline without unmoderated in-app messaging spam.
* **Alternatives Considered**: WebSocket/STOMP in-app chat (rejected to avoid stateful socket infrastructure and chat moderation burdens).
* **Implementation**: `Enquiry` entity with owner status update endpoints.
* **Trade-offs**: Clean, audit-friendly lead tracking; no live typing indicators or in-app messaging.
* **Status**: `LOCKED`

---

### DEC-10: Two-Tier Trust Model (Owner Verification Separated from Property Approval)
* **Decision**: Enforce a two-tier trust shield: Owner identity verification (`owner_profiles.verification_status`) is evaluated separately from individual property listing moderation (`properties.status`).
* **Why We Need It**: Prevents fraudulent brokers from bypassing trust by creating fake accounts or listing unverified properties. Trust is grounded in a concrete operational pipeline:
  `Owner declares ownership/representation → Documents submitted → Admin review → Owner VERIFIED + Property APPROVED → Property eligible for LIVE`
* **Alternatives Considered**: Property-only moderation (rejected because brokers easily fake individual listings); all-in-one onboarding form (rejected due to severe owner drop-off).
* **Implementation**: Admin review queues for owners and properties are distinct. A property can only become `LIVE` if `owner_profiles.verification_status == VERIFIED` and `properties.status == APPROVED`.
* **Trade-offs**: Multi-step administrative workflow; high tenant trust and anti-broker defense.
* **Status**: `LOCKED`

---

### DEC-11: Exclusion of Premature Distributed Infrastructure
* **Decision**: Do NOT include Redis, Kafka, RabbitMQ, Elasticsearch, PostGIS, or Kubernetes in MVP-0.
* **Why We Need It**: The MVP-0 traffic profile and structured data model are handled cleanly by PostgreSQL B-tree composite indexes, Spring Boot thread pools (`@Async`), and Next.js client caching. Discovery is kept as a clean product capability, not a search-engine subsystem (`PostgreSQL → JPA / Specifications → Property search API → Leaflet Map`).
* **Alternatives Considered**: Adding Redis/Kafka or Elasticsearch upfront (rejected as premature enterprise over-engineering that distracts from shipping a working product).
* **Implementation**: Database transactions handle business consistency; `@Async` handles non-blocking email delivery; standard decimal coordinates handle viewport bounding-box queries; JPA Specifications handle dynamic filters.
* **Trade-offs**: Maximum simplicity, zero distributed synchronization bugs; query performance will be benchmarked via `EXPLAIN/ANALYZE`.
* **Status**: `LOCKED`

---

### DEC-12: Client-Agnostic Core REST API for Web and Future Mobile
* **Decision**: Design the backend REST API (`/api/v1`) as a client-agnostic core consumed by the Next.js web application today and future native iOS/Android applications tomorrow.
* **Why We Need It**: Prevents designing a "web-only" API that requires building a second mobile backend when native apps are introduced on the roadmap.
* **Alternatives Considered**: Backend-for-Frontend (BFF) node server (rejected as unnecessary layer); GraphQL (rejected to avoid query complexity).
* **Implementation**: Standard JSON REST endpoints returning `ApiResponse<T>`, secured by Bearer JWT tokens and cookie refresh mechanisms.
* **Trade-offs**: Clean, reusable API architecture; requires keeping DTO contracts strictly decoupled from web-specific HTML requirements.
* **Status**: `LOCKED`

---

### DEC-13: KYC Document Privacy, Retention & Sensitive Access Audit Policy
* **Decision**: Store all sensitive verification documents in private, non-web-accessible storage (`/var/app/secure-docs/`), enforce download streaming with strict security headers, prohibit storing plaintext identity numbers (PAN/Aadhaar) in database tables, and record immutable audit logs on administrative access.
* **Why We Need It**: To comply with privacy standards (DPDP / GDPR) and prevent identity theft, unauthorized data harvesting, or accidental exposure through public web servers or CDN caches.
* **Alternatives Considered**: Storing KYC documents in public S3/Nginx directory (rejected as catastrophic security vulnerability); storing plaintext Aadhaar/PAN numbers in `owner_profiles` (rejected because documents are the evidence and storing raw numbers increases regulatory compliance blast radius).
* **Implementation**:
  * **Zero Nginx Route**: `/var/app/secure-docs/` is completely unmapped in Nginx. Files can ONLY be fetched through the authenticated Spring Boot streaming endpoint `GET /api/v1/documents/{id}/download`.
  * **Strict Download Headers**: Every response carries `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `Content-Disposition: attachment; filename="<sanitized>"`.
  * **Immutable Admin Access Audit**: Every administrative download or view of an owner document creates a persistent audit entry in `admin_document_access`.
  * **Development Invariant**: Real government documents are prohibited in development, CI, and test environments. Only synthesized dummy test files are permitted.
  * **Retention & Erasure**: Rejected documents are marked inactive and purged after 30 days. On account deletion or user data erasure request, physical documents and database rows are wiped permanently. Verified documents are retained securely for the active lifetime of the owner account for legal zero-broker compliance.
* **Trade-offs**: Requires streaming documents through application JVM and maintaining audit trails; eliminates identity leakage vectors.
* **Status**: `LOCKED`

