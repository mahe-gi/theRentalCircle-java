# RentalCircle 🏠

> **Zero-Brokerage Verified Real-Estate Marketplace for India**

RentalCircle is a zero-broker property marketplace where verified property owners (title deed holders or authorized representatives) list residential and commercial properties for free, while registered tenants and buyers search listings, explore locations on a map, connect directly with owners through WhatsApp, schedule visits, and report suspicious listings. Administrators verify owners and moderate properties to ensure marketplace trust and safety through a concrete operational pipeline (`Owner declaration → Documents submitted → Admin review → Owner VERIFIED + Property APPROVED → LIVE`).

---

## 1. Project Authority & Canonical Documents

This `README.md` serves solely as developer onboarding documentation. Canonical project control documents govern all architectural and product decisions:

1. [prd.md](file:///Users/mahesh/Desktop/therentalcircle/prd.md) — Product requirements, user journeys, conceptual hierarchy, and roadmap (Highest Authority).
2. [architecture.md](file:///Users/mahesh/Desktop/therentalcircle/architecture.md) — Modular monolith technical architecture, data model (17 tables), storage, and boundaries.
3. [design.md](file:///Users/mahesh/Desktop/therentalcircle/design.md) — UI/UX design system, visual tokens, and component specifications.
4. [tasks.md](file:///Users/mahesh/Desktop/therentalcircle/tasks.md) — Execution roadmap organized across 8 vertical product slices.
5. [decisions.md](file:///Users/mahesh/Desktop/therentalcircle/decisions.md) — 12 canonical architectural decisions and change management protocol.
6. [memory.md](file:///Users/mahesh/Desktop/therentalcircle/memory.md) — Living project state, active slice tracking, and failure recovery ledger.

---

## 2. Core Marketplace Scope (MVP-0)

### What We Are Building
* **Discovery**: Intuitive property discovery covering residential and commercial properties for buy and rent across Indian cities and localities, powered directly by PostgreSQL JPA dynamic queries and Leaflet map exploration (no heavy search engine subsystem).
* **Interactive Map**: Leaflet.js with OpenStreetMap-compatible tiles, viewport bounding-box search.
* **Owner Onboarding & Free Posting**: Multi-step property listing wizard with public photo uploads.
* **Two-Tier Trust Shield**: Owner identity verification (KYC/Aadhaar/PAN) separated from property approval.
* **Direct Owner Connections**: Pre-populated WhatsApp deep links (`https://wa.me/`) with server audit events, structured form enquiries, and scheduled site visits.
* **Trust & Operations**: Fraud/broker reporting engine, user/listing suspension, in-app notification center, and append-only administrative audit records (`admin_actions`).
* **Client-Agnostic Core API**: `/api/v1` REST API designed for the web client today and native iOS/Android mobile clients in the future.

### Preserved for Future Phases (Not in MVP-0)
* Digital rental agreements with e-signatures (V1).
* Property management and rent collection tools (V2).
* Guaranteed rent payouts (V2+).
* Home loan financing comparisons and real-estate yield intelligence (Future).
* Native Android/iOS mobile applications (Future client).

---

## 3. Technology Stack & Compatible Versions

* **Backend**: Java 21 LTS (`eclipse-temurin:21-jre-jammy`) / Spring Boot `4.1.1`
* **Base Package**: `com.platform.*` (Application entry: `com.platform.Application`)
* **Persistence**: Spring Data JPA / Flyway / PostgreSQL `17.11` (`postgres:17.11-alpine`)
* **Frontend**: Next.js `16.x` Active LTS (`16.3.6`) / React `19.x` compatible / TypeScript
* **Frontend Runtime**: Node.js `24.21.0` LTS (Host `v24.21.0`) / npm `11.19.0`
* **Styling & State**: Tailwind CSS / TanStack Query v5 / Axios
* **Maps**: Leaflet `1.9.4` with OpenStreetMap-compatible tiles
* **Ingress & Proxy**: Nginx `1.30-alpine` / Docker Compose v2 (Docker `29.8.0`)

---

## 4. Local Development Setup

### 1. Prerequisites
* [Docker](https://docs.docker.com/get-docker/) (v29.8.0+) & Docker Compose v2
* [JDK 21](https://adoptium.net/temurin/releases/?version=21)
* [Node.js](https://nodejs.org/) (v24.21.0 LTS) & npm (v11.19.0+)
* [Git](https://git-scm.com/)

### 2. Environment Configuration
Copy the safe development template:
```bash
cp .env.example .env
```
*(Note: Never commit real production secrets, passwords, or JWT keys to version control).*

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 4. Local Endpoints
* **Web Application**: `http://localhost/` (or `http://localhost:3000`)
* **REST API**: `http://localhost/api/v1` (or `http://localhost:8080/api/v1`)
* **Health Check**: `http://localhost/api/health`
* **Database**: `localhost:5432`

---

## 5. Build & Test Commands

### Backend (Spring Boot)
```bash
cd backend
./mvnw clean test      # Unit test suite
./mvnw clean verify    # Integration test suite
```

### Frontend (Next.js)
```bash
cd frontend
npm install            # Install dependencies
npm run lint           # Linter and type check
npm run build          # Production build
```

---

## 6. Physical Storage Volumes

Files are stored in two isolated Docker persistent volumes:
* `uploads_data` (`/var/app/uploads`): Public property photos, served directly by Nginx at `/uploads/*`.
* `secure_docs_data` (`/var/app/secure-docs`): Private owner verification documents, completely unmapped in Nginx and streamed solely through authenticated Spring Boot endpoints with owner or admin verification.
