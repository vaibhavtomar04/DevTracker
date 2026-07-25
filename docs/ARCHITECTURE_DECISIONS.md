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
