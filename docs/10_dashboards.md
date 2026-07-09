# Chapter 10: Dashboard Documentation

This document describes the role-specific dashboards, workspace metrics, widget designs, and state behaviors implemented in DevTrack 2.0.

---

## 10.1 Developer Dashboard
- **Purpose**: Personalized workspace for developers to track active development tasks, address raised bugs, and transition tasks from creation to UAT release.
- **Widgets & Widgets Layout**:
  - **KPI Cards**: Count of Active CRs, Pending Reviews, and Open Assigned Bugs.
  - **My Active Workspace (Table)**: List of assigned CRs matching search query. Actions include: Start Development, Deploy to SIT, Verify & Complete SIT, and Submit for Code Review.
  - **My Assigned Bugs (Table)**: List of bugs assigned to the developer. Developer can click a bug, view steps to reproduce, and submit a fix comment to mark it as `RESOLVED`.
  - **Status Update Drawer**: Right-anchored sliding panel containing fields for comments and files (proof of testing screenshot, unit testing document).
- **Permissions**: View and edit only self-assigned tasks and bugs.
- **API Calls**: `GET /api/tasks`, `GET /api/bugs`, `POST /api/tasks/{id}/status`.

---

## 10.2 Tester Dashboard
- **Purpose**: Shared workspace for quality engineers to self-assign tasks from the pool, log defects, and approve testing runs.
- **Tabs / Sub-Queues**:
  - **Testing Pool**: Shows CRs in UAT state with no tester (`TESTING_POOL`). Actions: "Assign to Me".
  - **My Assigned Testing**: CRs self-assigned by the current tester. Actions: "Raise Bug" (opens modal), "Testing Passed" (promotes to `TESTING_COMPLETED`).
  - **Bugs & Defective CRs**: Defective CRs showing open bugs. Shows all relevant information logged during the bug-raising stage.
- **Permissions**: View all UAT items; assign tasks to self; raise and close bugs for self-assigned tasks.
- **API Calls**: `GET /api/tasks`, `POST /api/tasks/{id}/assign-tester`, `POST /api/bugs`.

---

## 10.3 Admin Dashboard (CR Management & Configs)
- **Purpose**: Global control room for system configurations, role management, code review approvals, audit trails, and tester reassignment.
- **Views**:
  - **CR Management (Table)**: Comprehensive list of all CRs. Displays detailed transition dates (SIT deploy, SIT completed, UAT deploy, testing completed, bug raised/resolved, UAT completed, prod deploy dates).
  - **Admin Action Panel (Drawer)**: Allows code reviews approval/rejection and tester reassignments (requiring a mandatory justification reason).
  - **MFA Reset View**: Reset MFA for locked out users.
  - **User Configs Table**: Lists user roles and credentials.
- **Permissions**: System-wide view, edit, approve, reassign, and configuration access.
- **API Calls**: `GET /api/users`, `POST /api/tasks/{id}/reassign-tester`, `POST /api/auth/approve-cr`.
