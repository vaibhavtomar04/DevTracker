# DevTrack 2.0
### Enterprise SDLC & Change-Management Platform

Track change requests, sprints, bugs, testing, and releases across the full software delivery lifecycle — with first-class auditability, RBAC, and real-time notifications.

---

`Java` · `Spring Boot` · `MySQL` · `React` · `TypeScript` · `Vite`

---

## 📖 Overview
**DevTrack 2.0** is a production-grade, full-stack platform that manages the entire Software Development Life Cycle (SDLC) as a single governed workflow. It unifies change requests (CRs), sprint planning, bug tracking, QA/testing, and release management behind a strict role-based access model, an immutable audit trail on every action, and real-time notifications.

The platform is built for engineering organizations that need traceability and control — every state transition records the actor, timestamp, device, IP, and reason, so nothing happens without an accountable, reviewable record.

* **Visual identity**: Deep Emerald + Graphite + Copper — a premium, enterprise aesthetic focused on clarity, precision, and speed.

---

## 🎯 Use Cases
* **Change governance** — raise, assign, review, approve, and deploy change requests through an enforced state machine, with mandatory comments on destructive transitions.
* **Sprint delivery** — plan backlogs, run kanban boards, visualize Gantt timelines, and track burndown against capacity.
* **Bug lifecycle management** — raise bugs against CRs, triage by severity, route through fix → retest → pass/reopen loops, with attachments and annotated screenshots.
* **QA / testing pool** — testers claim CRs from a shared pool, execute tests, and record pass/fail results without leaving the workspace.
* **Release management** — track DEV/SIT/UAT/PROD environments, schedule releases, publish release notes, and log deployments and rollbacks.
* **Audit & compliance** — full, filterable, exportable audit timelines across CRs, bugs, releases, and administrative actions.
* **Reporting & analytics** — developer performance, sprint summary, bug analysis, deployment logs, CR cycle time, release history, and audit trails, with async exports.

---

## ✨ Key Features

### Change Request (CR) Engine
* **Enforced state machine**: `CREATED` → `ASSIGNED` → `DEVELOPMENT` → `APPROVAL` → `SIT` → `UAT` → `TESTING` → `PASSED` → `PRODUCTION` → `COMPLETED` (with `BUG_RAISED`, `IN_FIX`, `RETEST`, and `REJECTED` branches).
* Auto-generated CR IDs and suggested branch names.
* Table, Kanban, and Timeline/Gantt views with URL-synced filters.
* Threaded comments with @mentions, document uploads, and a visual Audit Timeline.

### Sprint Management
* Epic-grouped backlog with drag-to-sprint and inline story points.
* Kanban with WIP limits, draggable Gantt bars with dependencies, and Recharts burndown (ideal vs actual).

### Bug Tracking
* Records as `BUG-{YYYY}-{NNNN}`, linked to CRs and environments.
* Severity levels (Critical / Major / Minor / Trivial), reproducible steps, and rich attachments (screenshot annotation, syntax-highlighted logs, inline video).

### Tester Portal
* Personal testing queue, shared testing pool with self-claim, and inline “Raise Bug” / “Mark Passed” panels.

### Admin Portal
* Analytics dashboard (KPI cards, CR funnel, bug-severity donut, velocity, deployment scatter).
* Approval center with batch approve, user management (auto username + one-time temp password), and a full-width audit timeline.

### Release Management
* Live environment dashboard (DEV/SIT/UAT/PROD) with health pulse and auto-refresh.
* Release calendar, publishable release notes, deployment history, and rollback logs (typed CONFIRM guard).

### Notifications & Security
* Real-time notifications via WebSocket (SSE fallback) plus a grouped notification center.
* JWT access + refresh tokens in HttpOnly Secure cookies, BCrypt hashing, account lockout, method-level `@PreAuthorize`, CSRF/CORS, input validation, and audit logging on every action.
* Microsoft Entra ID / Azure AD OAuth2 (“Continue with Microsoft”).
* Transactional HTML email templates: User Created, Temporary Password, Password Reset, Bug Raised, Status Update, Code Review, and Ready-for-Testing.

---

## 🖥️ Screenshots
*Replace the placeholders below with real screenshots stored under `docs/screenshots/`.*

| Developer Dashboard | CR Detail & Audit Timeline |
| :--- | :--- |
| ![Developer Dashboard](docs/screenshots/dev-dashboard.png) | ![CR Detail](docs/screenshots/cr-detail.png) |

| Sprint Kanban | Release Environment Dashboard |
| :--- | :--- |
| ![Sprint Kanban](docs/screenshots/sprint-kanban.png) | ![Release Dashboard](docs/screenshots/release-dashboard.png) |

| Admin Analytics | Notification Email |
| :--- | :--- |
| ![Admin Analytics](docs/screenshots/admin-analytics.png) | ![Email Template](docs/screenshots/email-template.png) |

---

## 👥 Roles & Permissions

| Role | Access |
| :--- | :--- |
| **ADMIN** | All developer + tester capabilities, plus user management, approval center, analytics, audit logs, release management, and all reports. |
| **DEVELOPER** | Own CRs, sprint board, bug-fix queue, personal reports, release calendar (read-only). |
| **TESTER** | Testing pool, claim CRs, raise bugs, retest queue, pass history, release calendar (read-only). |

> [!NOTE]
> Access is enforced on both the route (`RoleGuard`) and component (`usePermission`) level, and authoritatively on the backend via Spring Security method security.

---

## 🏗️ Architecture

```
React 19 Frontend  (Vite + TypeScript, Tailwind, shadcn/ui, Framer Motion)
        ↕  HTTPS / WebSocket (SSE fallback)
Spring Boot 3.3.4 Backend  (Java 17, Spring Security + JWT, JPA/Hibernate)
        ↕
MySQL 8  +  Flyway migrations   (LONGBLOB document storage, abstracted for MinIO/S3)
```

* **Backend**: Feature-based Clean Architecture, constructor injection, MapStruct mappers, Specification-based filtering, optimistic locking (`@Version`), soft deletes (`active_flag`), bounded `@Async` executor + Spring Events + `@Scheduled`, Actuator health/metrics, and SpringDoc OpenAPI 3.
* **Frontend**: Strict TypeScript (no `any`), feature-scoped Zustand stores, TanStack Query for server state, React Hook Form + Zod, `@dnd-kit`, Recharts, and a fully documented design-system component library.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript (strict), Tailwind CSS, shadcn/ui, Framer Motion, React Router 7 |
| **State / Data** | Zustand, TanStack Query v5, Axios, React Hook Form + Zod |
| **Charts / UI** | Recharts, Lucide, Sonner, `@dnd-kit`, class-variance-authority |
| **Backend** | Java 17, Spring Boot 3.3.4, Spring Security, Spring Data JPA / Hibernate |
| **Database** | MySQL 8, Flyway migrations |
| **Auth** | JWT + refresh tokens (HttpOnly cookies), BCrypt, Microsoft OAuth2 |
| **Build / Docs** | Maven, SpringDoc OpenAPI 3 + Swagger UI |
| **Testing** | Vitest + React Testing Library + Playwright (FE); JUnit unit + integration (BE) |

---

## 🚀 Getting Started

### Prerequisites
* Java 17+, Maven 3.9+
* Node.js 20+ and npm/pnpm
* MySQL 8 running locally

### 1. Clone
```bash
git clone https://github.com/<your-org>/devtrack.git
cd devtrack
```

### 2. Database Setup
```sql
CREATE DATABASE devtrack;
```
*Flyway applies all migrations automatically on backend startup. Never drop or rename existing tables.*

### 3. Backend Setup
```bash
cd backend
# configure env vars (see Configuration) then:
mvn spring-boot:run
```
*API runs at `http://localhost:8080/api/v1` — Swagger UI at `http://localhost:8080/swagger-ui.html`.*

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*App runs at `http://localhost:5173`.*

---

## ⚙️ Configuration
All secrets come from environment variables — **never commit credentials**.

| Variable | Description | Example |
| :--- | :--- | :--- |
| **DB_HOST** | MySQL host | `localhost` |
| **DB_PORT** | MySQL port | `3306` |
| **DB_NAME** | Database name | `devtrack` |
| **DB_USERNAME** | DB user | `root` |
| **DB_PASSWORD** | DB password | `********` |
| **JWT_SECRET** | JWT signing key (stable across restarts) | `<64-char secret>` |
| **MAIL_HOST / MAIL_PORT** | SMTP server | `smtp.example.com / 587` |
| **APP_LOGO_URL** | Public URL used in email templates | `https://.../logo.png` |
| **MS_OAUTH_CLIENT_ID** | Microsoft Entra client ID | `<guid>` |

> [!TIP]
> Per-environment config lives in `application-{dev|staging|prod}.properties`.

---

## 📁 Project Structure

```
devtrack/
├─ backend/                 # Spring Boot 3 (Java 17)
│  └─ src/main/java/...     # feature packages: auth, cr, sprint, bugs, testing, admin, release, reports, notifications
│  └─ src/main/resources/db/migration   # Flyway V1, V2, V3...
├─ frontend/                # React 19 + Vite + TypeScript
│  └─ src/
│     ├─ design-system/     # tokens, motion, component library
│     ├─ features/          # auth, cr, sprint, bugs, testing, admin, release, reports, notifications
│     ├─ shared/            # api client, hooks, stores, utils
│     └─ router/
└─ docs/                    # documentation & screenshots
```

---

## 🗺️ Roadmap
* `[x]` Design system, auth, dashboards, CR / sprint / bug modules
* `[x]` Tester & admin portals, release management, notifications
* `[ ]` Redis-backed caching & rate limiting
* `[ ]` MinIO / S3 document storage (Phase 2)
* `[ ]` Security hardening & remediation (stable JWT key, rate-limiting filter)

---

## 📄 License
Proprietary — © DevTrack 2.0. All rights reserved.

*Built with precision — Deep Emerald · Graphite · Copper.*
