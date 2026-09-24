# RentalCircle — Product Requirements Document (prd.md)

> **Document Status**: `CANONICAL PRODUCT AUTHORITY`  
> **Version**: 2.0 (Product-Driven Marketplace Baseline)  
> **Market**: India  
> **Scope**: MVP-0 Core Marketplace + Platform Roadmap  

---

## 1. Product Vision & North Star

RentalCircle is a **zero-brokerage real-estate marketplace** where verified property owners (title deed holders or authorized representatives) list residential and commercial properties for free, and registered buyers and tenants discover, evaluate, and connect directly with them.

```text
               RENTALCIRCLE REAL-ESTATE PLATFORM
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
  DISCOVERY              OWNER PLATFORM              TRUST
  - Buy & Rent           - Free Listing Post        - Owner Verification
  - Residential/Comm.    - Manage Properties        - Property Review
  - Search & Filters     - Lead Pipeline            - Reports & Spam
  - Maps & Details       - Direct Connection        - Append-Only Audit
  - Favorites                  │                       │
       │                       ▼                       │
       └───────────────►  CONNECTION  ◄────────────────┘
                         - WhatsApp Deep Links
                         - Structured Enquiries
                         - Site Visit Requests
                               │
                               ▼
                    FUTURE PLATFORM SERVICES
                    - Rental Agreements (eSign)
                    - Property Management
                    - Rent Management
                    - Guaranteed Rent
                    - Home Loans & Financing
                    - Real Estate Intelligence
```

### The Core Proposition
* **Discovery First**: Intuitive real-estate discovery covering residential and commercial properties for rent and sale, implemented simply via PostgreSQL dynamic queries and interactive maps without heavy search infrastructure.
* **Direct Owner Connection**: Zero middlemen, zero broker commissions, direct owner connection via WhatsApp, structured enquiries, and scheduled property visits.
* **Verification as a Concrete Trust Layer**: Trust is enforced through a strict operational pipeline:
  `Owner declares ownership/representation → Documents submitted → Admin review → Owner VERIFIED + Property APPROVED → Property eligible for LIVE`
* **Small, Working MVP-0**: Focus strictly on the core marketplace transaction first, keeping the broader real-estate platform direction visible, clean, and unblocked.

---

## 2. Conceptual Product Hierarchy

```text
REAL-ESTATE PLATFORM
|
+-- DISCOVERY
|   +-- Buy
|   +-- Rent
|   +-- Residential (Apartment, Villa, Independent House, Plot)
|   +-- Commercial (Office, Shop, Showroom, Commercial Space)
|   +-- Search & Filtering (City, Locality, Price, BHK, Furnishing)
|   +-- Map Exploration (Leaflet/OSM Viewport Pins)
|   +-- Property Details & Photo Gallery
|   +-- Saved Favorites
|
+-- OWNER PLATFORM
|   +-- Become Owner (Declaration as Title Owner or Authorized Representative)
|   +-- Owner Verification (Identity Proof, KYC)
|   +-- Free Property Posting (Multi-step listing wizard)
|   +-- Property Lifecycle Management
|   +-- Enquiries Dashboard
|   +-- Visit Request Management
|   +-- WhatsApp Contact Activity Tracking
|
+-- TRUST & SAFETY LAYER
|   +-- Owner Identity Verification Review
|   +-- Property Listing & Document Moderation
|   +-- User & Listing Reporting Engine
|   +-- Administrative Actions & User Moderation
|   +-- Append-Only Administrative Audit Records
|
+-- CONNECTION
|   +-- Structured Form Enquiry (Pipeline tracking)
|   +-- Scheduled Site Visits (Booking & Rescheduling)
|   +-- Direct WhatsApp wa.me Deep Links
|
+-- FUTURE PLATFORM SERVICES (Preserved on Roadmap, Not in MVP-0)
    +-- Rental Agreements (Digital drafting, terms, e-signature)
    +-- Rent Management (Payment schedules, receipts, rent collection)
    +-- Property Management (Tenant onboarding, inspections, maintenance)
    +-- Guaranteed Rent (Corporate leases, assured rental payouts)
    +-- Home Loans / Financing (Eligibility calculator, partner enquiries)
    +-- Real Estate Intelligence (Price trends, rental yields, demand heatmaps)
```

---

## 3. Product Roles & Declarations

### 3.1 User (Buyer / Tenant)
* Can browse public properties and map views without mandatory login.
* Must register and log in to:
  * Save favorite properties.
  * Submit structured enquiries.
  * Request and manage property site visits.
  * Access verified owner WhatsApp contact links.
  * Report suspicious properties or fraudulent broker activity.

### 3.2 Owner (Title Holder or Authorized Representative)
* Starts as a registered user, then completes the **Become an Owner** declaration.
* Supports two distinct declaration profiles:
  1. **Genuine Property Owner**: Direct title deed holder.
  2. **Authorized Representative**: Family member, caretaker, or Power of Attorney holder.
* Can create and draft property listings freely.
* **Separation of Role and Verification**:
  * `ROLE_OWNER` grants access to the Owner Portal and property creation tools.
  * `VERIFIED` is an administrative state awarded after submitted identity documents pass review.
  * Properties **cannot** become `LIVE` until trust verification conditions are satisfied.

### 3.3 Platform Administrator (Trust & Safety)
* Possesses global moderation authority:
  * Reviews owner identity documents (`VERIFIED`, `REJECTED`, `MORE_INFORMATION_REQUIRED`).
  * Reviews submitted property listings and proof of ownership.
  * Resolves user-submitted spam/broker reports.
  * Warns, suspends, or blocks fraudulent accounts.
  * Every administrative state-changing action is permanently recorded in audit logs.

---

## 4. MVP-0 Core Marketplace User Journeys

### 4.1 Buyer / Tenant Journey
```text
Register / Login
  │
  ▼
Search & Filter by Location, Price, BHK, Type (Buy / Rent)
  │
  ▼
Browse Results & Interactive Map
  │
  ▼
Open Property Detail View (Photos, Specs, Location, Verified Owner Badge)
  │
  ├───────────────────┼───────────────────┼───────────────────┐
  ▼                   ▼                   ▼                   ▼
Save Favorite      Submit Enquiry     Book Site Visit     WhatsApp Direct
                                                          (wa.me link)
  │
  ▼ (Optional)
Report Suspicious Listing or Broker
```

### 4.2 Property Owner Journey
```text
Register / Login
  │
  ▼
Become Owner (Declare Title Holder or Authorized Representative)
  │
  ▼
Submit Verification Documents (Aadhaar / PAN / Power of Attorney)
  │
  ▼
Create Property Listing (Details, Pricing, Amenities, Map Pin, Photos)
  │
  ▼
Submit Property for Administrative Review
  │
  ▼
Wait for Verification:
  [ Owner Verified ] + [ Property Approved ] ──► Status becomes LIVE
  │
  ▼
Receive Tenant Enquiries, Manage Site Visits, Track WhatsApp Leads
```

### 4.3 Administrator Moderation Journey
```text
Login to Admin Console
  │
  ├───────────────────────────────┼───────────────────────────────┐
  ▼                               ▼                               ▼
Owner Review Queue            Property Review Queue           Reports Queue
- Inspect KYC Docs            - Inspect Listing Data          - Review Spam/Broker Reports
- Verify / Reject / Info      - Inspect Property Proofs       - Investigate & Resolve
                              - Approve / Reject / Info       - Suspend / Block Bad Actors
  │                               │                               │
  └───────────────────────────────┴───────────────────────────────┘
                                  ▼
                   Permanent Audit Trail Recorded
```

---

## 5. Property Lifecycle State Machine

The property state machine enforces clear boundaries between drafting, administrative moderation, and public marketplace exposure:

```text
┌──────────┐      Submit       ┌───────────┐      Admin Starts     ┌──────────────┐
│  DRAFT   ├──────────────────►│ SUBMITTED ├──────────────────────►│ UNDER_REVIEW │
└──────────┘                   └─────┬─────┘                       └──────┬───────┘
                                     │                                    │
                                     │ Reject                             ├─────────────┐
                                     ▼                                    ▼             ▼
                               ┌───────────┐                        ┌──────────┐  ┌───────────┐
                               │ REJECTED  │                        │ APPROVED │  │ MORE_INFO │
                               └───────────┘                        └────┬─────┘  └───────────┘
                                                                         │
                            Owner Verified & Ready                       │
                                                                         ▼
                                                                   ┌───────────┐
                                                                   │   LIVE    │
                                                                   └─────┬─────┘
                                                                         │
                                       ┌─────────────────────────────────┼─────────────────────────────────┐
                                       ▼                                 ▼                                 ▼
                                 ┌───────────┐                     ┌───────────┐                     ┌───────────┐
                                 │  RENTED   │                     │   SOLD    │                     │ SUSPENDED │
                                 └───────────┘                     └───────────┘                     └───────────┘
```

### The Live Eligibility Invariant
> **`OWNER VERIFIED` + `PROPERTY APPROVED` = `PROPERTY ELIGIBLE FOR LIVE`**

* **`DRAFT`**: Owner is creating and editing property specifications, location, and photos. Not visible to the public or admin review queues.
* **`SUBMITTED`**: Owner submits property for moderation. Valid coordinates and required fields are mandatory.
* **`UNDER_REVIEW`**: Admin has locked the listing for active verification.
* **`APPROVED`**: Admin approves the property details and photos.
* **`LIVE`**: The property appears publicly in search and map discovery. Can only occur if the owner profile is also in `VERIFIED` status.
* **`REJECTED` / `MORE_INFORMATION_REQUIRED`**: Admin returns property with explicit remarks.
* **`RENTED` / `SOLD` / `INACTIVE`**: Owner or admin marks the listing closed.
* **`SUSPENDED`**: Admin removes listing from search due to report or policy violation.

---

## 6. Trust, Safety & Anti-Broker Standards

* **Two-Stage Verification Shield**:
  1. *Owner Identity Verification*: Validates the person listing the property.
  2. *Property Documentation Review*: Validates the real-estate asset and pricing reality.
* **Zero Brokerage Guarantee**: Free listing for owners, zero brokerage fees for tenants and buyers.
* **Suspicious Listing Reporting**: Any registered user can flag a listing with reasons (`BROKER`, `SPAM`, `FAKE_PROPERTY`, `WRONG_PRICE`, `SCAM`).
* **Auditability**: Every administrative action (approval, rejection, suspension, report resolution) produces an append-only administrative audit record with restricted access.

---

## 7. Multi-Phase Platform Roadmap

The real-estate platform direction is preserved across phased milestones. **Future services are explicitly kept out of MVP-0 implementation**:

### MVP-0 — Core Marketplace (Current Scope)
* Discovery (Buy & Rent, Residential & Commercial, Search, Maps, Details, Favorites).
* Owner Onboarding & Declaration.
* Owner & Property Verification moderation queues.
* Direct Connections (WhatsApp deep links with audit event, structured enquiries, site visits).
* Trust & Operations (Reporting engine, admin moderation, in-app notifications, audit trail).

### V1 — Transaction Assistance
* Formal rental agreement drafting with standardized legal templates.
* Digital signature coordination.
* Enhanced negotiation and deal-closing workflows between owner and tenant.

### V2 — Owner Services
* Property Management tools (tenant directory, inspection logs, repair tracking).
* Rent Management (automated monthly payment schedules, reminder notifications, rent receipts).

### V2+ — Guaranteed Rent
* Platform rental management contracts.
* Assured monthly rental payouts to owners.
* Platform-managed tenant sourcing and property upkeep.

### Future — Financing & Intelligence
* **Home Loans**: Buyer financing calculator, eligibility checks, institutional partner lead integration.
* **Real Estate Intelligence**: Locality price trend analytics, rental yield benchmarks, market demand heatmaps.

### Future — Mobile Application
* Native Android and iOS mobile applications consuming the **same client-agnostic backend REST API (`/api/v1`)**. No separate mobile backend or duplicated business logic.

---

## 8. Out of Scope for MVP-0 (Explicit Exclusions)

To maintain focus and avoid over-engineering, the following are strictly excluded from MVP-0:
* In-app real-time chat, WebSockets, or messaging threads.
* Payment gateway integrations or rent escrow accounts.
* Automated digital rental agreement generation or e-signing.
* Guaranteed rent underwriting or property management services.
* Direct Meta WhatsApp Business API integration (standard `wa.me` links are used).
* Dedicated search engines (Elasticsearch, Meilisearch), distributed message brokers (Kafka, RabbitMQ), or distributed caches (Redis).
* Microservice architecture, service mesh, or Kubernetes.

---

## 9. Success Criteria for MVP-0

MVP-0 is successful when a genuine owner can onboard, declare identity, upload property details, pass administrative moderation, and have their listing discovered by a genuine tenant who connects directly via WhatsApp or site visit with zero broker interference.
