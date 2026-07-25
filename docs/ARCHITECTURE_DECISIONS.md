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
