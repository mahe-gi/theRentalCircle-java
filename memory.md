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
| **Slice 2: Authentication** | User Registration, JWT & Refresh Session | `[ ] TODO` | V1 Flyway migration, Spring Security filter chain. |
| **Slice 3: Owner + Property** | Owner Onboarding, Draft Wizard & Photos | `[ ] TODO` | V2 & V4 migrations, property CRUD, photo uploads. |
| **Slice 4: Trust Layer** | Verification Documents & Admin Moderation | `[ ] TODO` | V3 migration, secure doc storage, LIVE eligibility rule. |
| **Slice 5: Discovery** | Search, Filters, Map & SSR Details | `[ ] TODO` | JPA search specifications, Leaflet map, details page. |
| **Slice 6: Connection** | WhatsApp, Enquiries, Visits & Favorites | `[ ] TODO` | V5 migration, wa.me deep links, visit scheduling. |
| **Slice 7: Trust & Operations**| Reports, Moderation, In-App Notifications | `[ ] TODO` | V6 migration, reporting engine, admin audit logs. |
| **Slice 8: Hardening** | E2E Testing, Security Audits & Deployment | `[ ] TODO` | Full user journey verification script. |

---

## 4. Active Checkpoint Log

```text
[CHECKPOINT-20260924-06]
- Timestamp: 2026-09-24T14:27:00+05:30
- Phase: SLICE 1 — Foundation (Runnable Skeleton & Environment) COMPLETED
- Status: VERIFIED & OPERATIONAL
- Verification Evidence:
  1. Docker Stack:
     * `platform-postgres` (PostgreSQL 17.11): Healthy, port 5432
     * `platform-backend` (Spring Boot 4.1.1 on Java 21 LTS): Healthy, port 8080
     * `platform-frontend` (Next.js 16.3.6 standalone on Node 24): Healthy, port 3000
     * `platform-nginx` (Nginx 1.30.5): Healthy, port 80
  2. Database Migrations:
     * Flyway executed `V0__init.sql` automatically via `FlywayConfig` on startup.
     * `platform_system_info` table initialized: `1 | 2026-09-24 08:56:30.582712+00 | 1.0.0-slice1`
     * `flyway_schema_history` records `V0__init.sql` applied cleanly.
  3. Network Ingress & Health Checks:
     * `curl -i http://localhost/api/health` -> HTTP 200 OK
       `{"success":true,"message":"Platform API is healthy and operational","data":{"framework":"Spring Boot 4.1.1","runtime":"Java 21 LTS","status":"UP"}}`
     * `curl -s -o /dev/null -w "%{http_code}\n" http://localhost/` -> HTTP 200 OK (Next.js SSR Landing Page rendered through Nginx proxy)
- Next Action: Ready to begin Slice 2 (Authentication & User Identity) using minimum 5+ subagents.
```

---

## 5. Genuinely Unresolved Open Decisions

The following 5 decisions remain open for product/business clarification:
1. **Public Property Address Precision**: Whether public unauthenticated visitors view the exact door/building number or only the locality/street level prior to verified login.
2. **WhatsApp Direct Redirect vs. Verification Landing**: Direct redirect to `wa.me/<owner_number>` vs. displaying an intermediate trust modal confirming verified user status.
3. **Owner Document Redaction / Retention Policy**: Post-verification data lifecycle and redaction rules for government identity documents (PAN / Aadhaar).
4. **User Dual-Role Capability**: Whether a single registered user account can dynamically switch between tenant/buyer mode and owner mode under one identity, or whether a role-switch UI is required.
5. **Mandatory Contact Prerequisite**: Whether mobile phone verification (via SMS OTP) should be a hard prerequisite for user registration or deferred until the first contact/visit action.
