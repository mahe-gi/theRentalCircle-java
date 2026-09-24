# RentalCircle — Technical Architecture Document (architecture.md)

> **Document Status**: `CANONICAL TECHNICAL AUTHORITY`  
> **Version**: 2.0 (Product-Driven Architecture Baseline)  
> **Related Documents**: [prd.md](file:///Users/mahesh/Desktop/therentalcircle/prd.md) | [design.md](file:///Users/mahesh/Desktop/therentalcircle/design.md) | [decisions.md](file:///Users/mahesh/Desktop/therentalcircle/decisions.md) | [tasks.md](file:///Users/mahesh/Desktop/therentalcircle/tasks.md)

---

## 1. Architectural Philosophy & Simplicity Invariant

The engineering architecture is built on one governing principle:

> **"Build the smallest correct marketplace now, while keeping the larger real-estate platform direction visible and unblocked."**

```text
REAL ESTATE PLATFORM
│
├── Discovery
│   ├── Buy
│   ├── Rent
│   ├── Residential
│   ├── Commercial
│   ├── Search
│   ├── Map
│   └── Property details
│
├── Owner Platform
│   ├── Become owner
│   ├── Verification
│   ├── Create listing
│   ├── Manage listing
│   └── Leads
│
├── Trust & Safety
│   ├── Owner verification
│   ├── Property review
│   ├── Reports
│   ├── Moderation
│   └── Audit
│
├── Connection
│   ├── WhatsApp
│   ├── Enquiry
│   ├── Visit
│   └── Favorites
│
└── Future
    ├── Rental agreements
    ├── Property management
    ├── Rent management
    ├── Guaranteed rent
    ├── Home loans
    └── Intelligence
         ↓
    REST API /api/v1
         ↓
┌────────┴────────┐
↓                 ↓
Web / Next.js    Future Mobile
         ↓
Spring Boot Modular Monolith
         ↓
    PostgreSQL
```

### The Simplicity Invariants
* **No Microservices**: A clean modular monolith deployed as a single containerized application.
* **No Premature Caching or Message Brokers**: No Redis, Kafka, or RabbitMQ for MVP-0. Database transactions and in-memory Spring thread pools handle MVP-0 needs cleanly.
* **No Dedicated Search Engine**: Discovery is a clean product capability, not a search-engine subsystem. For MVP-0: `PostgreSQL → JPA / Specifications → Property search API → Leaflet Map`. No Elasticsearch architecture, indexing pipeline, or Redis cache.
* **No PostGIS**: Standard decimal coordinates with bounding-box queries support the interactive map.
* **Generic Technical Naming**: All technical identifiers are decoupled from product branding (`com.platform.*`, `Application.java`, `/var/app/uploads`, `platform-network`).

---

## 2. System Context & Client-Agnostic Core

The backend provides a unified, client-agnostic REST API (`/api/v1`) designed to serve both the web client today and native mobile applications in the future without backend duplication:

```text
       WEB CLIENT (Next.js 16.x)               FUTURE MOBILE CLIENT
     (SSR Public + CSR Dashboards)              (Native Android / iOS)
                  │                                        │
                  └───────────────────┬────────────────────┘
                                      │  HTTPS / REST JSON
                                      ▼
                        ┌───────────────────────────┐
                        │       Nginx Gateway       │
                        │    (Port 80 / 443 SSL)    │
                        └─────────────┬─────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
            ▼ /api/v1/*                                         ▼ /uploads/*
┌───────────────────────────────────────┐           ┌───────────────────────┐
│     Spring Boot Modular Monolith      │           │ Public Images Volume  │
│      (Boot 4.1.1 / Java 21 LTS)       │           │   (/var/app/uploads)  │
│                                       │           └───────────────────────┘
│  - Controllers → Services → Repos     │
│  - Spring Security (Stateless JWT)    │
│  - In-App Notifications & Audit       │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│       PostgreSQL 17.11 Database       │
│          (Port 5432 / ACID)           │
│  - 17 Domain-Normalized Tables        │
│  - 6 Phased Flyway Migrations (V1-V6) │
│  - Composite B-Tree Indexes           │
└───────────────────────────────────────┘
```

---

## 3. Technology Stack & Architectural Baseline

The technical architecture locks the core platform and runtime baselines. Rather than enumerating artificial transitive patch ranges, exact application dependencies and framework peer dependencies (such as React 19.x for Next.js 16) are resolved deterministically by package managers and committed to `pom.xml` and `package-lock.json` during project setup:

| Tier | Component | Architectural Baseline | Resolution & Locking Rule |
|---|---|---|---|
| **Backend Runtime** | Java (Eclipse Temurin) | `eclipse-temurin:21-jre-jammy` | Java 21 LTS maintenance runtime builds. |
| **Backend Framework** | Spring Boot | `4.1.1` | Latest stable GA on Java 21 LTS (Spring Security, Spring Data JPA, DI). |
| **Persistence & Migrations**| Spring Data JPA / Flyway | Spring Boot 4.1 managed | Versioned SQL migrations (`V1`–`V6`), Hibernate `ddl-auto: validate`. |
| **Database** | PostgreSQL | `17.11` (`postgres:17.11-alpine`) | Current recommended stable minor release of PostgreSQL 17 line. |
| **Frontend Framework** | Next.js App Router | `16.x` Active LTS (`16.3.6`) | Active LTS release; hybrid SSR for public SEO + CSR for dashboards. |
| **Frontend Peer Runtime** | React | `19.x` compatible | Resolved by npm per Next.js 16 peer requirements and locked in `package-lock.json`. |
| **Frontend Host Runtime** | Node.js / npm | `24.21.0` LTS / `11.19.0` | Active LTS JavaScript runtime matching host environment. |
| **Frontend Language** | TypeScript | Strict (`"strict": true`) | Resolved via npm, strict type definitions mirroring backend DTOs. |
| **Client State / HTTP** | TanStack Query / Axios | TanStack v5 / Axios | Resolved via npm for server-state caching and automatic 401 refresh. |
| **Map Rendering** | Leaflet.js | `1.9.4` (OSM tiles) | Interactive client-side map without proprietary per-load fees. |
| **Proxy & Ingress** | Nginx | `1.30-alpine` | Current stable Alpine reverse proxy, static asset cache, SSL termination. |
| **Container Engine** | Docker / Compose | `29.8.0` / Compose `v2.x` | Single-command reproducible execution environment. |

---

## 4. Backend Module Architecture

The backend is packaged under the neutral namespace `com.platform.*`. Each module represents a bounded business domain within a single Spring Boot application. Modules communicate via direct Spring `@Service` calls:

```text
com.platform/
├── Application.java                 # Entry point (@SpringBootApplication)
├── config/                          # Security, JWT, WebMvc, FileStorage, Async
├── common/                          # BaseEntity, ApiResponse<T>, GlobalExceptionHandler
│
├── auth/                            # Login, Register, RefreshToken, JwtTokenProvider
├── user/                            # User entity, Role, UserProfile
├── owner/                           # OwnerProfile, OwnerDeclaration
├── property/                        # Property, PropertyImage, PropertyAmenity
├── location/                        # City, Locality, Coordinates
├── document/                        # Verification Document metadata & FileStorageService
├── verification/                    # VerificationRequest, Owner/Property review workflow
├── search/                          # Public property search & JPA dynamic specifications
├── contact/                         # WhatsApp wa.me links, ContactEvent audit
├── enquiry/                         # Structured form enquiry pipeline
├── visit/                           # Site visit scheduling & lifecycle
├── favorite/                        # User saved properties
├── report/                          # Fraud & broker reporting engine
├── notification/                    # In-app notifications & non-blocking @Async email
└── admin/                           # Moderation queues, AdminAuditService, AdminAction
```

### Module Boundary Invariants
1. **No Microservices**: Modules share the same process, JVM, and database connection pool.
2. **Direct Service Calls**: Cross-module operations call `@Service` interfaces. No internal REST or RPC hops.
3. **No Cross-Module Repository Calls**: `EnquiryService` calls `PropertyService`, never `PropertyRepository` directly.
4. **No Circular Dependencies**: Dependencies flow unidirectionally toward domain owners and `common`.

---

## 5. Database Schema & Migration Strategy

The PostgreSQL database comprises exactly **17 domain-normalized tables**. Rather than a single giant migration, Flyway migrations are split into **6 domain-aligned vertical slices**:

```text
V1__auth_and_users.sql         ──► users, roles, user_roles, refresh_tokens
V2__owner_profiles.sql         ──► owner_profiles
V3__verification_documents.sql ──► documents, verification_requests
V4__property_domain.sql        ──► properties, property_images, property_amenities
V5__connections.sql            ──► contact_events, enquiries, visits, favorites
V6__trust_and_operations.sql   ──► reports, notifications, admin_actions
```

### The 17 Canonical Database Tables
1. `users`: Core account identity (email, password hash, mobile, user type).
2. `roles`: Lookup roles (`ROLE_USER`, `ROLE_OWNER`, `ROLE_ADMIN`).
3. `user_roles`: Many-to-many user-role assignments.
4. `refresh_tokens`: Hashed refresh tokens for server-controlled revocation and rotation.
5. `owner_profiles`: 1:1 with `users`, tracking owner declaration and verification status.
6. `documents`: Metadata for private verification files (Aadhaar, PAN, title deeds).
7. `verification_requests`: Administrative review workflow tracking for owners and properties.
8. `properties`: Core real-estate listings with specs, price, and location.
9. `property_images`: Public photos linked to properties with display order and primary flag.
10. `property_amenities`: Tagged amenities (parking, lift, security, water supply).
11. `contact_events`: Audit log of user-initiated WhatsApp clicks.
12. `enquiries`: Structured one-way lead submissions from users to owners.
13. `visits`: Scheduled property site visits with date, time slot, and status.
14. `favorites`: Saved listings bookmarked by registered users.
15. `reports`: Fraud, scam, and broker reports filed against properties or users.
16. `notifications`: In-app notification alerts with read/unread tracking.
17. `admin_actions`: Append-only administrative audit records of all moderation actions with restricted access.

### Entity Relationship & Traversal Chain
```text
users (id)
  1
  │
  └── owner_profiles (id, user_id)
          1
          │
          └── properties (id, owner_profile_id)
```
* **Property Ownership Invariant**: `properties.owner_profile_id` references `owner_profiles.id`. Authorization verifies `property.getOwnerProfile().getUser().getId().equals(currentUserId)`.

---

## 6. Property State Machine & Trust Invariants

Property status transitions enforce platform integrity:

```text
DRAFT ──► SUBMITTED ──► UNDER_REVIEW ──► APPROVED ──► LIVE
                             │
                             ├─────────► REJECTED
                             └─────────► MORE_INFORMATION_REQUIRED
```

### The Live Eligibility Invariant
> **`OWNER VERIFIED` + `PROPERTY APPROVED` = `PROPERTY ELIGIBLE FOR LIVE`**

The trust pipeline operates through a strict multi-step sequence:
```text
Owner declares ownership/representation
               │
               ▼
   Documents submitted (KYC/Deeds)
               │
               ▼
     Admin Review & Moderation
               │
               ▼
Owner VERIFIED + Property APPROVED
               │
               ▼
    Property ELIGIBLE FOR LIVE
```

1. **`ROLE_OWNER` vs. `VERIFIED`**:
   * `ROLE_OWNER`: User has declared intent to list as a property owner or representative.
   * `VERIFIED`: The owner's submitted identity and proof documents have passed admin review.
2. **Approved vs. Live**:
   * An admin can mark a property `APPROVED` based on listing quality and photos.
   * However, a property **cannot** transition to `LIVE` in the public marketplace unless the listing owner's profile is in `VERIFIED` status.

---

## 7. Authentication, Session & Token Architecture

RentalCircle implements a stateless access JWT + server-controlled refresh token model:

* **Short-Lived Access JWT**: 15-minute lifespan. Carries `sub` (userId), `email`, and `roles`. Validated statelessly on routine requests via `JwtAuthenticationFilter`.
* **Refresh Token**: 7-day lifespan. A cryptographically random UUID whose SHA-256 hash is persisted in the `refresh_tokens` table.
* **Delivery via Cookie**: Delivered via an `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` cookie. Client-side JavaScript cannot read the token value.
* **Server-Side Atomic Rotation & Reuse Detection**: A frontend Axios mutex is insufficient against cross-tab, multi-device, or concurrent process race conditions. Refresh-token rotation and reuse detection are enforced atomically at the database level within a transaction:
  ```sql
  UPDATE refresh_tokens
  SET revoked_at = NOW(), replaced_by = :newTokenHash
  WHERE id = :id AND revoked_at IS NULL AND expires_at > NOW();
  ```
  If `rowsUpdated == 0`, a concurrent rotation or reuse attempt has occurred. The server immediately treats this as token reuse: it revokes ALL active refresh tokens for the user account (`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = :userId`), clears the refresh cookie, logs an administrative security alert, and forces full re-authentication.
* **Access-JWT Suspension Semantics**: Refresh-session revocation prevents renewal. Already-issued access JWTs remain valid until expiry (15 minutes) unless the request path performs a live account-status check.
  * **MVP-0 Decision**: Routine public searches and read requests remain completely stateless for maximum throughput and architectural simplicity.
  * For critical state-mutating operations (such as property submission, listing status updates, and moderation actions), the service layer validates `user.isActive()` against the database, preventing suspended users from mutating state even during the short 15-minute token expiry window.

---

## 8. Physical Storage Isolation & File Security

RentalCircle strictly isolates storage into two directories mounted via Docker persistent volumes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FILE INGESTION PIPELINE                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       Strict Server Validation (Size, Whitelist, Magic Bytes, UUID Name)
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        PUBLIC PROPERTY PHOTOS             PRIVATE OWNER DOCUMENTS
   - Path: /var/app/uploads              - Path: /var/app/secure-docs
   - Volume: uploads_data                - Volume: secure_docs_data
   - Served: Nginx directly (Read-Only)  - Served: Spring Boot API ONLY
   - Access: Public URL (/uploads/*)     - Access: Authenticated stream (/api/v1/documents/{id}/download)
```

### The 9 Mandatory File Security Rules
1. **Never Trust Client Filename**: Generated UUID filenames (`<uuid>.webp`) are used on disk; client filenames are stored only as sanitized metadata.
2. **Never Trust Client MIME Type**: The incoming `Content-Type` header is ignored for validation.
3. **Extension Whitelist**: Images (`.jpg`, `.jpeg`, `.png`, `.webp`); Documents (`.pdf`, `.jpg`, `.jpeg`, `.png`).
4. **Inspect Magic Bytes**: Server-side file signature inspection (%PDF, JPEG header, PNG header) verifies real content.
5. **Reject Executable Content**: Shell scripts, bytecode, PHP, or HTML tags masquerading as images/PDFs are rejected with HTTP 400.
6. **Enforce Size Limits**: Max 10MB for photos, 20MB for documents, enforced at both Nginx and Spring Boot.
7. **Generate Server Storage Filenames**: Random UUIDs prevent path traversal (`../`) and collisions.
8. **Store Sensitive Docs Outside Nginx**: `secure_docs_data` is completely unmapped in Nginx.
9. **Authorize Every Private Download**: Access requires explicit ownership or admin role (`document.owner.user.id == currentUser.id || currentUser.hasRole('ADMIN')`).

---

## 9. Notification Architecture: Transactional vs. Best-Effort

Notifications maintain a strict separation between transactional database writes and non-blocking delivery:

* **In-App Notifications (TRANSACTIONAL - Core MVP)**: Persisted directly to the `notifications` table within the same database transaction as the triggering business event (property approved, visit requested, enquiry sent). Guaranteed zero event drift.
* **Email Notifications (BEST EFFORT - Optional MVP)**: Dispatched asynchronously (`@Async`) outside the database transaction. `@Async` is not a durable queue; if the application crashes before delivery, the email may be lost. This is acceptable for MVP-0 because the primary in-app notification record remains durable in PostgreSQL.

---

## 10. Map, Location & Direct WhatsApp Architecture

* **Interactive Map**: Leaflet.js with OpenStreetMap-compatible tiles. Stores coordinates as standard `DECIMAL(10, 8)` and `DECIMAL(11, 8)` in PostgreSQL. Viewport searches use bounding box comparisons (`lat BETWEEN :minLat AND :maxLat`). Public tile infrastructure usage complies with provider attribution and rate-limit policies.
* **Direct WhatsApp Connections**: Standard `https://wa.me/<owner_number>?text=...` deep links generated on-demand. Calling `POST /api/v1/properties/{id}/contact` verifies the requesting user is logged in, records an audit event in `contact_events`, and returns the deep link. No Meta WhatsApp Business API integration is needed for MVP-0.

---

## 11. Frontend Architecture: Strict SSR vs. CSR Boundary

```text
frontend/src/app/
├── (public)/                 # Next.js Server Components / SSR
│   ├── page.tsx              # Landing page (SEO optimized)
│   └── properties/           # Search marketplace & property details
│
├── (auth)/                   # Centered login & registration layout
│
└── (authenticated)/          # Client Components ('use client')
    ├── (dashboard)/          # User saved listings, visits, enquiries
    ├── owner/                # Owner portal, property wizard, KYC docs
    └── admin/                # Trust queues, reports, audit logs
```

* **SSR for Public Pages**: Public marketplace pages are rendered on the server for instant HTML paint and OpenGraph SEO previews without requiring auth tokens.
* **CSR for Dashboards**: Authenticated areas operate strictly as Client Components (`'use client'`).
* **Token Handling Rule**: Authenticated dashboards must **NOT** assume Server Components can access the in-memory access JWT. Client components attach the token via an Axios request interceptor and use TanStack Query for server state. No Backend-for-Frontend (BFF) node server or Redis session store is introduced.

---

## 12. Repository Structure & Target Layout

```text
rentalcircle/
├── .gitignore
├── README.md
├── docker-compose.yml              # Local orchestration (nginx, backend, frontend, postgres)
├── .env.example                    # Safe fake development environment variables
│
├── nginx/
│   ├── Dockerfile
│   └── conf.d/default.conf         # /api/* -> 8080, /* -> 3000, /uploads/* -> static
│
├── backend/
│   ├── pom.xml                     # Spring Boot 4.1.1, Java 21 LTS
│   ├── Dockerfile
│   └── src/
│       ├── main/
│       │   ├── java/com/platform/  # Application.java & domain modules
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/   # V1__... through V6__...
│       └── test/
│
└── frontend/
    ├── package.json                # Next.js 16.x (16.3.6), React 19.x compatible, TypeScript
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── Dockerfile
    └── src/
        ├── app/                    # Next.js App Router (pages & layouts)
        ├── components/             # Reusable UI & domain components
        ├── lib/api-client.ts       # Axios instance with auth & refresh interceptors
        └── types/                  # TypeScript interface definitions
```

### The Repository Reality Rule
> **"The target structure above is an intended placement map, not proof that files or classes currently exist. Developers and AI agents must inspect the actual repository before creating, importing, or editing files."**

---

## 13. Future Architecture Boundary (Preserved on Roadmap)

The modular monolith is designed to cleanly accommodate planned post-MVP capabilities without rewrites:

```text
CURRENT MODULAR MONOLITH             FUTURE DOMAIN EXTENSIONS
┌───────────────────────────┐        ┌───────────────────────────────┐
│     RentalCircle Core     │        │ - agreements (eSign & legal)  │
│                           ├───────►│ - property_management (Ops)   │
│ - Discovery & Search      │        │ - rent_management (Payments)  │
│ - Owner Verification      │        │ - guaranteed_rent (Contracts) │
│ - Property Moderation     │        │ - financing (Home Loans)      │
│ - Direct Connections      │        │ - intelligence (Yield Trends) │
└───────────────────────────┘        └───────────────────────────────┘
```

### Strict Prohibition Against Placeholder Services
> **DO NOT create premature placeholder services, classes, or tables for future capabilities (e.g., `GuaranteedRentService`, `LoanService`, `AgreementService`) during MVP-0. The architecture supports future modules through clean domain separation, not dead placeholder code.**
