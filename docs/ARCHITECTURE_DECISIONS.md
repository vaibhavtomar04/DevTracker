# Architecture Decision Record (ADR)

## ADR-001: DevTrack 2.0 Design System & Token Cleanup

- **Status:** Approved & Implemented
- **Date:** 2026-07-25
- **Branch:** `feature/ui-theme-cleanup`

### Context
`DevTrack 2.0` previously suffered from:
1. A contradictory color system in `index.css` remapping `violet/cyan/sky/teal/indigo/purple` variables to green primary/secondary variables, obscuring semantic role coding.
2. Fill vs. glow hue mismatches caused by hardcoded arbitrary shadow glows (`shadow-[0_0_80px_rgba(139,92,246,0.25)]`).
3. Excessive unthrottled infinite animations (`animate-pulse`, `animate-orbit`, `animate-scan-line`) running continuously on static background chrome.
4. Absence of `prefers-reduced-motion` handling and low contrast ratios in light mode.

### Decision
1. **Semantic Token Taxonomy:** Defined explicit semantic tokens under `@theme` in `index.css`:
   - `--color-brand-*` (Green `#63a659` — Primary Platform Brand)
   - `--color-dev-*` (Indigo `#6366f1` — Developer Role)
   - `--color-tester-*` (Cyan `#06b6d4` — Tester Role)
   - `--color-info-*` (Sky `#0ea5e9` — Information & Notices)
   - `--color-success-*` (Green `#22c55e` — Success Status)
   - `--color-danger-*` (Rose `#f43f5e` — Error & Critical Status)
   - `--color-pending-*` (Amber `#f59e0b` — Warning & Pending Status)
   - Neutrals remain Slate (`#64748b`).

2. **Removal of Remap Overrides:** Deleted the CSS variable overrides (`--color-violet-* → var(--primary-*)`, etc.), restoring distinct role coding across the platform.

3. **Glow/Fill Coherence:** Standardized fill-matched glow utilities (`glow-brand`, `glow-dev`, `glow-tester`, `glow-info`, `glow-success`, `glow-danger`, `glow-pending`) and replaced hardcoded arbitrary shadow glows.

4. **Motion Budget & Accessibility:**
   - Removed infinite animation loops from ambient background chrome (`DashboardLayout`, `developerDashboard`).
   - Added global `@media (prefers-reduced-motion: reduce)` block in `index.css`.
   - Updated light mode contrast tokens for WCAG AA compliance (contrast ratio ≥ 4.5:1).

### Consequences
- **Positive:** Improved visual hierarchy, reduced GPU overhead from ambient loops, WCAG AA compliance, and clear role distinction (Dev = Indigo, Tester = Cyan, Info = Sky, Brand = Green).
- **Git Safety:** Executed entirely on `feature/ui-theme-cleanup` with immutable tagged phase checkpoints (`ui-phase0-verified` through `ui-phase5-cleanup`).

---

## ADR-002: Multi-Developer Single CR (Co-Ownership)

- **Status:** Accepted
- **Date:** 2026-07-25
- **Branch:** `feature/multi-developer-cr`

### Context
A Change Request historically belonged to exactly one developer via `tasks.assigned_developer_id`. Teams increasingly needed several developers to co-own a single CR — sharing its dashboard visibility, sprint/deployment/leaderboard presence, bug workload, notifications, and recognition — without introducing a "primary" hierarchy and without regressing the single-developer experience the entire platform is built around.

### Decision
1. **Co-ownership model:** A CR may be owned by N ≥ 1 developers, all equal (no primary). The team is chosen **at creation only** and is **immutable** thereafter — there is no add/remove path for an existing CR's developer set. Any co-owner can advance the CR, and the change reflects for all.

2. **Additive / strangler-fig architecture:** No forked single- vs multi-dev logic.
   - `tasks.assigned_developer_id` is retained as a legacy **sentinel mirror** = the creator / first-selected developer.
   - The `task_developers` join table holds the full co-owner set (`TaskDeveloper`); `bug_developers` mirrors this for bugs (`BugDeveloper`).
   - All new reads compute the union `{assignedDeveloper} ∪ {task_developers}`. For N = 1 the union collapses to the sentinel, so single-developer behavior is **byte-for-byte identical**.

3. **Surfacing:** All co-owner names render everywhere (CR list/detail, sprint board, deployments, leaderboard, dashboards, audit rows, emails) using a compact `A, B +N` form with a full tooltip in narrow columns.

4. **Bugs & recognition:** A bug raised against a co-owned CR is visible to every co-owner; any of them can pick it up or resolve it. Recognition points are split **equally** across the union (event-level `pointsOverride` with `strategy = EQUAL`); aggregate score metrics credit each co-owner with full participation, since counts cannot be fractional.

5. **Notifications & audit:** Every co-owner is a recipient (in-app union; bug emails CC the co-owner union). Audit rows always record the acting user (`changedBy`) as the actor, while the CR developer field lists all co-owners.

6. **Feature flag:** `ENABLE_MULTI_DEV_CR` (frontend `FEATURES` flag, env `VITE_ENABLE_MULTI_DEV_CR`, default **enabled**) gates **only** the multi-select UI in the Create CR modal. Backend union reads are always on regardless of the flag; disabling it simply restores the legacy single-developer selection UI as a kill-switch.

### Consequences
- **Positive:** True team co-ownership with equal standing and no primary-owner hierarchy; single-developer flows are provably unchanged (N = 1 union collapse); a clean UI kill-switch for staged rollout.
- **Trade-offs:** Immutable teams mean a mis-assignment requires a new CR rather than an in-place edit; equal point-splitting is a deliberate policy choice over weighted contribution.
- **Git Safety:** Executed entirely on `feature/multi-developer-cr` with immutable tagged phase checkpoints (`mdev-phase0-verified` through `mdev-phase5-cleanup`); `main` is never directly committed and the PR is approval-gated.

---

## ADR-003: WebSocket Lifecycle — Singleton Connection Manager

- **Status:** Accepted (Phase 1.1 build + WS regression checklist passed on clean-log capture; immutable checkpoint tag `perf-phase1-stable` = commit `423d199` created 2026-07-26)
- **Date:** 2026-07-26
- **Branch:** `feature/performance-architecture-migration`
- **Phase:** 1.1 (Stabilize — WebSocket lifecycle)

### Problem
While idle on the dashboard, REST traffic compounded without ever plateauing (P2). Runtime verification (Phase 0) confirmed **~9 → ~13 and climbing** simultaneous `/ws/notifications?userId=` sockets (DevTools WS tab), all initiated by `notificationStore.ts`, growing on back/forth navigation.

Root cause in `notificationStore.ts` `connect()`: `reconnectAttempts`, `doConnect`, `fetchDataDebounceTimer` and the reconnect `setTimeout` were **closure-locals recreated on every `connect()` call**. `connect()` only closed the stored `_ws` and cleared the stored `_pollInterval` — it never cancelled a prior closure's pending reconnect timer. So each extra `connect()` (React StrictMode double-invoke, route remount, re-login) spawned an **independent, self-perpetuating reconnect chain**. Every surviving chain kept its own socket + `onmessage` handler, and each notification triggered a debounced `useTaskStore.fetchData(true)` → **8 REST calls** → N chains × 8 = the compounding curve. Two further defects: `ws.onclose` reconnected even after an intentional `disconnect()` (no intentional-close flag), and `reconnectAttempts` was reset to 0 on **every** `onopen`, removing the retry bound.

### Alternatives Considered
1. **Guard with a boolean `isConnected` flag** — insufficient; does not cancel already-scheduled reconnect timers from superseded closures.
2. **Move socket/timers into Zustand state** — possible, but exposes transport internals to React and still needs explicit supersession logic.
3. **Module-level singleton manager with a generation token (chosen).**

### Decision
Introduce a module-scoped singleton connection manager in `notificationStore.ts` that owns a single `activeSocket`, one reconnect chain (`reconnectTimer`), one poll timer (`pollTimer`) and one debounce timer (`debounceTimer`). A monotonically increasing `connectionGeneration` token is captured by every socket callback; any callback whose generation is stale returns immediately, so a superseded chain cannot act. `startManagedConnection()` is **idempotent** (reuses a live/connecting socket for the same user). An `intentionalDisconnect` flag suppresses reconnection after `disconnect()`. `reconnectAttempts` is bounded (max 5) and is **no longer reset on every `onopen`** — it resets only after the socket stays open for a `STABILITY_RESET_MS` (10s) stability window.

Gated behind `FEATURES.ENABLE_WS_LIFECYCLE_V2` (default on). The **legacy connection manager is preserved verbatim** and restored when the flag is off (strangler-fig; rollback without redeploy via `window.__FEATURES__` or `VITE_ENABLE_WS_LIFECYCLE_V2=false`).

### Technical Rationale
A generation token is the only approach that reliably neutralises already-scheduled timers from earlier `connect()` invocations without tracking each closure individually. Module scope guarantees a true per-tab singleton independent of React's component/StrictMode lifecycle.

### Trade-offs
- Connection state lives at module scope rather than in the store (transport is deliberately kept out of React state).
- The stability-window reset is a heuristic; a server that stays up >10s then flaps will still get a fresh retry budget (acceptable, and strictly better than resetting on every onopen).

### Risks
- If some caller depended on the store fields `_ws` / `_pollInterval` being populated in v2 mode, they will now be null (audited: only `connect`/`disconnect` reference them). Mitigated by the flag.
- Behavioural change to reconnect cadence under a flapping server; covered by the regression checklist.

### Expected Performance Impact
- Active WebSocket connections per user: **~9–13 → 1**.
- Idle REST requests driven by leaked chains: **eliminated** (a single healthy socket triggers at most one debounced refresh per notification burst; the legacy `fetchData(true)` fan-out is removed later in Phase 3).
- No change to notification correctness (dedupe-by-id + reconnect re-sync retained).

### Rollback Strategy
Set `ENABLE_WS_LIFECYCLE_V2=false` (runtime `window.__FEATURES__` or `VITE_ENABLE_WS_LIFECYCLE_V2=false`) to restore the legacy connection manager. No data migration involved.

### Related Files
- `frontend/src/store/notificationStore.ts`
- `frontend/src/config/appConfig.ts`

### Revision r2 — 2026-07-26 (Accepted; checkpoint tag `perf-phase1-stable` @ `423d199`)

**Additional root cause found during Phase 1.1 runtime verification.** The singleton manager above eliminated *reconnect-storm* churn, but a clean-log capture (DevTools WS, Preserve log **off**, hard reload) still showed **4–5 concurrent `notifications?userId=` sockets** with staggered ages, growing on navigation.

**Code-level cause (confirmed, not inferred):** in `App.tsx` every route element is wrapped in its own `<ProtectedRoute>`, which returns `<DashboardLayout>{children}</DashboardLayout>`; `DashboardLayout` renders `<Navbar>`, and Navbar owns the WS lifecycle effect (`connect()` on mount, `disconnect()` on unmount). Therefore **every navigation unmounts and remounts Navbar**, firing `disconnect()` then `connect()`. `main.tsx` wraps the app in `<StrictMode>`, which additionally double-invokes this on the initial mount. The singleton's idempotency only dedupes repeated `connect()` calls with **no intervening `disconnect()`**; a `disconnect()` reset `activeUserId` and tore the socket down, so each navigation opened a fresh socket. Aborting a still-`CONNECTING` socket does not reliably cancel the server-side upgrade, and `NotificationWebSocketHandler` frees sessions only in `afterConnectionClosed` (no reaping) — so orphaned server sessions linger (101/Pending).

**Fix (still one module — `notificationStore.ts` — still gated by `ENABLE_WS_LIFECYCLE_V2`; no routing/Navbar/UI/backend changes, honoring the non-goals):**
1. **Grace-period teardown.** `disconnect()` defers teardown by `TEARDOWN_GRACE_MS` (2s) instead of closing immediately. A `connect()` for the same user within that window cancels the pending teardown and reuses the existing live socket, collapsing navigation remounts + StrictMode double-invoke into **one socket per session**. A real logout has no following remount, so the deferred teardown fires and the socket closes.
2. **CONNECTING-safe teardown.** When a socket that is still `CONNECTING` must be closed, the `close()` is deferred to its `onopen` so no half-open orphan is left on the server.

**Verification (2026-07-26, user-captured):** clean DevTools WS capture (Preserve log off, hard reload) confirmed exactly **1** `notifications?userId=` socket after settle, holding at **1** across repeated back/forth navigation (the exact repro that previously climbed), with no idle REST fan-out from notifications. Accepted and tagged `perf-phase1-stable` @ `423d199`.

**Follow-up logged (out of Phase 1.1 scope — candidate for the Phase 2/4 backend pass):** add stale-session reaping in `NotificationWebSocketHandler.sendToUser` (its comment claims it removes closed sessions, but the code only skips them) and verify prompt close-handshake completion server-side.
