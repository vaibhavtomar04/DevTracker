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

---

## ADR-004: Single Dashboard Bootstrap Owner (Bootstrap De-duplication)

- **Status:** Accepted (Phase 1.2 build + cold-load network verification passed; immutable checkpoint tag `perf-phase1.2-bootstrap` = commit `81a97bc` created 2026-07-26)
- **Date:** 2026-07-26
- **Branch:** `feature/performance-architecture-migration`
- **Phase:** 1.2 (Stabilize — bootstrap de-duplication)

### Problem
Runtime verification (Phase 0) showed the developer dashboard cold load issuing the full core data batch **twice, concurrently**. `DashboardLayout` (rendered for every authenticated route via `<ProtectedRoute>`) fires `useTaskStore.fetchData()` (non-forced) + `fetchSprints()` on mount, while `developerDashboard` independently fired `fetchData(true)` (**forced**) + `fetchSprints()` in its own mount effect. Because the forced call bypasses the store's in-flight / 10s throttle guards, both ran in parallel on first paint — producing two overlapping copies of `/api/tasks?page=0&size=100` (~786 kB each), `/api/bugs` (~175 kB), `/api/audit` (~4.3 MB each), `/api/configs`, `/api/users`, and the batch-2 endpoints. This doubled the initial payload and REST count against the P1 cold-load budget with zero functional benefit (identical data fetched twice).

### Decision
Establish `DashboardLayout` as the **single owner** of the core task + sprint bootstrap. Pages assume the core data is already loading/loaded by the Layout and do not re-issue it. In `developerDashboard` the mount-effect `fetchData(true)` and `fetchSprints()` are gated behind `!FEATURES.ENABLE_NEW_BOOTSTRAP` (default on), so with the flag enabled the page trusts the Layout bootstrap and skips the duplicate forced fetch. `fetchSummary()` (role KPI cards) and `fetchBugReviews()` (page-specific data the Layout does not own) remain unconditional — they are not duplicates.

The 5s `setInterval(fetchData(true))` poll on the developer dashboard is intentionally **left unchanged** in this phase; polling removal is a separate, later strangler-fig step gated by `ENABLE_POLLING_REMOVAL`.

### Feature Flag
`ENABLE_NEW_BOOTSTRAP` (frontend `FEATURES`, env `VITE_ENABLE_NEW_BOOTSTRAP`, runtime override `window.__FEATURES__`, default **enabled**). The flag was registered in `appConfig.ts` (commit `82634f8`). Disabling it restores the legacy double-bootstrap (the page re-issues its own forced fetch) with no redeploy.

### Alternatives Considered
1. **Delete the page's fetch outright** — rejected; not reversible without a redeploy, violating the strangler-fig / reversible-flag mandate.
2. **Fold every dashboard into the flag at once** — deferred; `testerDashboard` / `adminDashboard` call `fetchData()` **non-forced**, so the in-flight / throttle guard already dedupes them against the Layout — they do not cause the P1 double-fetch. They can be gated later for symmetry.
3. **Dedupe in the store by demoting forced calls to non-forced while a fetch is in flight** — rejected; changes global fetch semantics and risks masking legitimately-needed forced refreshes elsewhere.

### Verification (2026-07-26, user-captured)
Cold hard reload (DevTools Network, Disable cache on) confirmed a **single** set of the bootstrap endpoints — one `/api/tasks?page=0&size=100` (786 kB), one `/api/bugs` (175 kB), one `/api/configs`, one `/api/audit` (4,313 kB), one each of `test-cases` / `bug-reviews` / `sprint-tasks` — where the pre-fix load issued two concurrent copies. KPI cards still populate from `fetchSummary`; no functional regression. DOMContentLoaded ≈ 2.19 s, Load ≈ 2.39 s. Accepted and tagged `perf-phase1.2-bootstrap` @ `81a97bc`.

### Consequences
- **Positive:** Eliminates the duplicate concurrent core batch on developer-dashboard cold load, removing a redundant ~4.3 MB `/api/audit` + ~786 kB `/api/tasks` + ~175 kB `/api/bugs` (plus batch-2) from first paint; clean per-flag rollback with no redeploy.
- **Trade-offs:** Pages now depend on the Layout having initiated the bootstrap; any page rendered outside `DashboardLayout` (none today) would need its own fetch or the flag off.
- **Note:** The remaining single `/api/audit` (~4.3 MB, ~930 ms) is now the largest cold-load cost and is the target of **Phase 1.3 (lazy `/api/audit`)**. A second, independent `/api/users` fetch observed in the capture is unrelated to this duplication and is flagged for the **Phase 1.4** reference-data split.

### Related Files
- `frontend/src/pages/developerDashboard.tsx` (import `FEATURES`; gate forced `fetchData(true)` + `fetchSprints()` behind `!ENABLE_NEW_BOOTSTRAP`)
- `DashboardLayout` (designated bootstrap owner — unchanged this phase)
- `frontend/src/config/appConfig.ts` (`ENABLE_NEW_BOOTSTRAP` flag)

---

## ADR-005: Lazy Audit Loading — Defer & De-poll the Audit Table

- **Status:** Accepted (Phase 1.3 build + `/api/audit` network verification passed; immutable checkpoint tag `perf-phase1.3-lazy-audit` = commit `8859adc` created 2026-07-26)
- **Date:** 2026-07-26
- **Branch:** `feature/performance-architecture-migration`
- **Phase:** 1.3 (Stabilize — lazy audit)

### Problem
After Phase 1.2 a single `/api/audit` (~4.3 MB, backend `getAllAuditLogs()` = unpaginated `findAll()`) was the largest remaining cold-load cost. Worse, runtime verification (DevTools Network filtered to `/api/audit`) revealed the full 4,313 kB table was being **re-downloaded ~21 times over a ~2-minute idle session** (~90 MB transferred; Finish ≈ 2 min) — a primary contributor to both **P1** (initial payload over the ≤ 2 MB budget) and **P2** (runaway idle traffic).

Root cause: `taskStore.fetchData` fetched `/api/audit` inside its **blocking** secondary batch, and the 5-second **forced** pollers (`developerDashboard`, `crManagement`, `recognition` → `fetchData(true)`) bypass the store's in-flight / 10s throttle guard and re-ran that batch every cycle. So the entire audit history was pulled roughly every 5 s. `auditLogs` is read by **six** surfaces — `audits.tsx`, `developerDashboard` (`getAuditDate` status dates), `crManagement` (`getAuditDate`), `deployments` (workflow / `ROLLBACK` filter), `CRDetailSlideOver` (reject-log), and `crAuditReport.service` — so the naive fix of "only load on the Audit page" would regress the dashboards / CR / deployments and was rejected.

### Decision
1. **Single source preserved.** `auditLogs` remains the one store field every consumer reads — no consumer is changed, so there is no functional regression.
2. **Off the critical path.** `/api/audit` is removed from the blocking secondary batch. With `ENABLE_LAZY_AUDIT` on, the remaining batch-2 endpoints (`test-cases`, `bug-reviews`, `sprint-tasks`) load as before and `isFetching` clears without waiting on audit, so audit is out of the initial payload and off the cold-load path.
3. **Deferred idle load.** A new `fetchAuditLogs()` store action performs the audit fetch, scheduled via `requestIdleCallback` (with a `setTimeout(1200 ms)` fallback) after first paint — but **only on the initial non-forced bootstrap** (`!force`) and **only when `auditLogs` is empty**. Consequently the 5 s forced pollers never re-download audit.
4. **Freshness by mutation, not by timer.** Every mutating store action (`updateTask`, `assignTester`, `reassignTester`, `completeTesting`, `approveTaskStep`, `rejectTaskStep`, bug updates) already refreshes `auditLogs` via its own fire-and-forget `/api/audit` reload, so audit updates exactly when it changes rather than on a 5 s cadence.

### Feature Flag
`ENABLE_LAZY_AUDIT` (frontend `FEATURES`, env `VITE_ENABLE_LAZY_AUDIT`, runtime override `window.__FEATURES__`, default **enabled**). Registered in `appConfig.ts` (commit `db8e289`). Disabling it restores the eager in-batch audit load (rollback without redeploy).

### Alternatives Considered
1. **Load audit only on the Audit page** — rejected; six surfaces read `auditLogs`, so dashboards / CR / deployments would regress.
2. **Defer but fire on every `fetchData`** (the first naive patch) — rejected; it reproduced the ~21× storm because the forced 5 s polls re-triggered the deferred load. The `!force` + empty-guard is what actually removes the idle storm.
3. **Per-entity audit (`/api/audit/{entityType}/{entityId}`) + pagination** — deferred to the Phase 4 backend pass (requires backend changes; out of this frontend-only scope).

### Verification (2026-07-26, user-captured)
With the `/api/audit` filter active: sat idle 1–2 min, then created a CR and advanced it (dev start → deploy). Result: exactly **3** audit fetches — 1 deferred bootstrap load (896 ms) + 2 from the two status transitions' own refreshes (2.58 s / 3.81 s) — and **zero during idle** (down from ~21 / ~90 MB). Initiator `dashboard:50`. Audit-derived UI (dashboard status dates, CR audit trail, deployments rollback rows, reject logs) still populates → no functional regression. Accepted and tagged `perf-phase1.3-lazy-audit` @ `8859adc`.

### Consequences
- **Positive:** Idle audit traffic eliminated (~90 MB → 0 during idle); audit off the cold-load critical path, dropping ~4.3 MB from the initial payload toward the ≤ 2 MB target; single-source store preserved so no consumer regresses; clean per-flag rollback.
- **Trade-offs:** Audit now populates a beat after first paint, so audit-derived dashboard dates fill one idle-tick late; a direct hard-load straight onto the Audits page may briefly show an empty list before the idle load lands (a later micro-polish could have `audits.tsx` call `fetchAuditLogs()` on mount). Because the poll no longer refreshes audit, cross-user audit changes during a long idle session are not reflected until the local user's next mutating action or navigation — an accepted trade for the idle-traffic budget.
- **Note (deferred to Phase 4 backend):** each remaining audit fetch is still the full unpaginated 4.3 MB table (0.9–3.8 s). Backend pagination of `/api/audit` + a lean DTO, and switching the per-action refreshes to per-entity (`/api/audit/{entityType}/{entityId}`), remain the backend job. The 5 s forced poll still re-runs the other batch-2 endpoints (`test-cases` / `bug-reviews` / `sprint-tasks`); polling removal is the later strangler-fig step gated by `ENABLE_POLLING_REMOVAL`.

### Related Files
- `frontend/src/store/taskStore.ts` (remove `/api/audit` from the blocking secondary batch; add `fetchAuditLogs()` action + `TaskState` entry; deferred idle load gated on `!force` && empty `auditLogs`)
- `frontend/src/config/appConfig.ts` (`ENABLE_LAZY_AUDIT` flag)

---

## ADR-006: Lean Forced Poll — Skip the Secondary Batch on Forced Polls

- **Status:** Accepted (Phase 1.3.1 build committed and tagged by author; immutable checkpoint tag `perf-phase1.3.1-lean-poll` = commit `efead225` created 2026-07-26)
- **Date:** 2026-07-26
- **Branch:** `feature/performance-architecture-migration`
- **Phase:** 1.3.1 (Stabilize — lean forced poll)

### Problem
Phase 1.3 took `/api/audit` off both the cold-load path and the 5 s forced-poll cadence (deferred idle load gated on `!force`). But the 5 s **forced** pollers — chiefly `developerDashboard`'s `setInterval(fetchData(true), 5000)` (confirmed via DevTools initiator: `developerDashboard.tsx:290` → `taskStore` `fetchData` → `apiClient`), plus `crManagement` / `recognition` — still re-ran the store's **entire secondary batch** (`/api/test-cases`, `/api/bug-reviews`, `/api/sprint-tasks`) on every cycle, because forced calls bypass the in-flight / 10 s throttle guard. This left steady-state idle traffic re-downloading the supplementary datasets every 5 s even though nothing changed, against the P2 zero-idle-REST budget.

### Decision
Introduce a **lean forced-poll** short-circuit in `taskStore.fetchData`. On a forced call with the flag on (`force && FEATURES.ENABLE_LEAN_POLL`), the store completes **Batch 1** (the core `/api/tasks`, `/api/bugs`, `/api/configs`, `/api/users`) and then returns — clearing `isFetching` — **before** the secondary-batch / lazy-audit branch. The guard is inserted immediately before the `ENABLE_LAZY_AUDIT` branch so that:
- **Forced 5 s polls** refresh only the core batch and skip `test-cases` / `bug-reviews` / `sprint-tasks` (and, via Phase 1.3, audit).
- **Non-forced bootstrap** (`force === false`, the `DashboardLayout` mount fetch) is untouched — it still loads the full secondary batch once, so no surface loses its data.

The secondary datasets therefore load once at bootstrap and refresh on mutating actions / navigation, not on the idle timer.

### Feature Flag
`ENABLE_LEAN_POLL` (frontend `FEATURES`, env `VITE_ENABLE_LEAN_POLL`, runtime override `window.__FEATURES__`, default **enabled**). Registered in `appConfig.ts` (commit `0e89785`). Disabling it restores the previous behavior where forced polls re-run the secondary batch (rollback without redeploy).

### Alternatives Considered
1. **Remove the 5 s poll entirely** — rejected for this phase; polling removal is the later strangler-fig step gated by `ENABLE_POLLING_REMOVAL` and depends on WS-driven sync (Phases 2–3). Lean-poll is the reversible intermediate that cuts idle cost without removing the safety-net poll.
2. **Gate each secondary endpoint independently** — unnecessary; they share the same "supplementary, not needed every 5 s" property, so one guard covers them.
3. **Demote forced polls to non-forced** — rejected (same reasoning as ADR-004); it changes global fetch semantics and could mask legitimately-needed forced refreshes.

### Verification (2026-07-26)
The `!force` guard was applied to `taskStore.ts`, committed (`efead225` "fixed lean poll") and tagged `perf-phase1.3.1-lean-poll` by the author. The patch structurally guarantees a forced poll returns before the secondary batch; the DevTools initiator capture confirmed forced 5 s polls continue to drive only the **core** batch (e.g. `/api/users` via `developerDashboard.tsx:290`), consistent with the secondary batch no longer firing on forced polls. No consumer loses data because the non-forced `DashboardLayout` bootstrap still loads the full secondary batch once.

### Consequences
- **Positive:** Steady-state idle traffic drops further — the supplementary datasets stop re-downloading every 5 s; combined with ADR-005 the idle poll now touches only the core batch.
- **Trade-offs / Known remainder:** The forced 5 s poll **still re-fetches all of Batch 1** — `/api/tasks`, `/api/bugs`, and notably the near-static reference data `/api/configs` + `/api/users` — every cycle. This is the second `/api/users` and the repeating `users` stream seen in the network capture, and is the explicit target of **Phase 1.4 (reference-vs-business split, `ENABLE_REFERENCE_CACHE`)**. Cross-user changes to the secondary datasets during a long idle session now surface on the next mutating action / navigation rather than within 5 s (accepted, same trade as ADR-005).
- **Note:** The safety-net poll itself is removed later via `ENABLE_POLLING_REMOVAL` once typed WS events (Phases 2–3) make it redundant.

### Related Files
- `frontend/src/store/taskStore.ts` (forced-poll short-circuit `if (force && FEATURES.ENABLE_LEAN_POLL) { set({ isFetching: false }); return }` before the secondary-batch / `ENABLE_LAZY_AUDIT` branch)
- `frontend/src/config/appConfig.ts` (`ENABLE_LEAN_POLL` flag)

---

## ADR-007: Event-Driven Reference Cache — Split Volatile vs. Reference Data on the Forced Poll

- **Status:** Accepted (Phase 1.4 build committed and tagged by author; immutable checkpoint tag `perf-phase1.4-reference-cache` = commit `7363e9dc` created 2026-07-26)
- **Date:** 2026-07-26
- **Branch:** `feature/performance-architecture-migration`
- **Phase:** 1.4 (Stabilize — reference-data cache)

### Problem
After Phase 1.3.1, the 5 s forced poll (`developerDashboard.tsx:290` → `fetchData(true)`) no longer ran the secondary batch, but it **still re-ran the entire Batch 1** every cycle — `/api/tasks`, `/api/bugs`, `/api/configs`, and `/api/users`. DevTools initiator analysis (`window.fetch @ dashboard:50` → `apiClient.ts:84` → `taskStore.ts:220`/`:240` → `developerDashboard.tsx:290`) confirmed the repeating `/api/users` stream (and the "second" cold-load `/api/users` = the first interval tick at ~t+5s) originated from that poll. `configs` and `users` are **near-static master/reference data** (role assignments, config key/values) that change only through explicit admin actions, so re-fetching them every 5 s is pure idle waste against the P2 zero-idle-REST budget — whereas `tasks` / `bugs` are the only genuinely volatile business data that needs the poll cadence.

### Decision
Split Batch 1 into **volatile business data** (`tasks`, `bugs`) and **reference data** (`configs`, `users`), gated by `ENABLE_REFERENCE_CACHE`:
1. **Reference data loads once** at the non-forced bootstrap (the `DashboardLayout` mount fetch), exactly as before.
2. **Forced polls reuse the cache.** On a forced `fetchData(true)` with the flag on and reference data already present (`skipReference = force && FEATURES.ENABLE_REFERENCE_CACHE && get().configs.length > 0 && get().users.length > 0`), the store skips the `/api/configs` and `/api/users` fetches (`Promise.resolve(null)` in their `Promise.all` slots) and reuses the copies already held in the Zustand store — which remains the single source of truth. Only `/api/tasks` + `/api/bugs` ride the 5 s poll. The preserved copies (`nextConfigs` / `nextUsers`) are also what gets written back to the `sessionStorage` core cache, so the cache stays consistent.
3. **Event-driven invalidation — no TTL, no timer.** Reference data stays fresh solely through the mutating actions that change it, which already refresh it in-store: `createUser` and `updateUserRoles` re-fetch `/api/users` and re-normalize roles; `updateConfig` updates `configs` from the PUT response. No time-based expiry and no background refresh timer are introduced.

### Feature Flag
`ENABLE_REFERENCE_CACHE` (frontend `FEATURES`, env `VITE_ENABLE_REFERENCE_CACHE`, runtime override `window.__FEATURES__`, default **enabled**). Registered in `appConfig.ts` (commit `c8642f1`). Disabling it restores reference data (`configs`, `users`) on every forced poll (rollback without redeploy).

### Alternatives Considered
1. **Long-TTL refresh (re-fetch reference data only when older than N minutes)** — rejected; adds a time heuristic and still produces periodic idle fetches. Pure event-driven invalidation is leaner and deterministic.
2. **Migrate reference data to the unused React Query layer (`useApiQueries.ts`)** — rejected for this phase; it would introduce a second source of truth alongside the Zustand store and violates one-module-per-change. The dead React Query layer is left untouched (candidate for a later cleanup phase).
3. **Refresh reference data on a WebSocket "data changed" signal** — deferred to the Phases 2–3 typed-event work; this phase deliberately keeps the change frontend-only and reversible.

### Verification (2026-07-26)
The Batch-1 split was applied to `taskStore.ts`, committed (`7363e9dc` "perf: reference-cache") and tagged `perf-phase1.4-reference-cache` by the author. Expected/observed behavior: cold load fetches `configs` + `users` once at bootstrap; during idle the 5 s poll re-fetches only `tasks` + `bugs`, and `/api/configs` + `/api/users` no longer repeat; creating a user / updating roles / editing a config still refreshes the respective list in every surface that reads it — no functional regression.

### Consequences
- **Positive:** The forced 5 s poll drops from 4 to 2 requests per tick; the repeating `/api/users` + `/api/configs` idle stream is eliminated. Combined with ADR-005 (audit) and ADR-006 (lean poll), the idle poll now carries only the two genuinely volatile datasets, moving decisively toward the 0-idle-REST / single-request-per-tick targets.
- **Trade-offs:** Reference data now reflects cross-user changes (another admin adds a user / edits a config) only on the local user's next reference-mutating action, navigation, or full reload — not within 5 s. This is an accepted trade consistent with ADR-005/006, and the eventual WS typed-event sync (Phases 2–3) will close it. The `skipReference` guard depends on the store already holding reference data; if it is somehow empty on a forced call the guard falls through and re-fetches (safe default).
- **Note:** The 5 s poll itself remains (now carrying only `tasks` + `bugs`); its removal is the later strangler-fig step gated by `ENABLE_POLLING_REMOVAL` once typed WS events make it redundant.

### Related Files
- `frontend/src/store/taskStore.ts` (Batch-1 split: `skipReference` guard; conditional `/api/configs` + `/api/users` fetch; `nextConfigs` / `nextUsers` reuse cached store copies when skipped and are written to the `sessionStorage` core cache)
- `frontend/src/config/appConfig.ts` (`ENABLE_REFERENCE_CACHE` flag)
