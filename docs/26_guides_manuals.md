# Chapter 26: User Manuals, Administrator & Deployment Guides

This document compiles operational manuals, deployment steps, system configurations, and troubleshooting guides for DevTrack 2.0.

---

## 26.1 User Manuals

### 1. Developer Workspace Manual
- **Creating a CR**: Click "Create CR" on the dashboard. Fill in all details (Jtrack ID, Title, Project, Category).
- **Working on a CR**:
  - Click "Start Development" (moves CR to `IN_PROGRESS`).
  - Deploy to SIT, then click "Verify & Complete SIT" (moves to `SIT_COMPLETED`).
  - Click "Submit for Review", entering the PR URL and branch.
- **Pushing to UAT**: Once the code review is approved, open the task, upload the mandatory unit testing document, and click "Deploy to UAT".
- **Resolving Bugs**: If the tester logs a bug, it will appear under your "Assigned Bugs" section. Fix the bug, write transition comments, and mark it as `RESOLVED`.

### 2. Tester Workspace Manual
- **Picking up a CR**: Navigate to the "Testing Pool" tab. Select a CR and click "Assign to Me" (moves it to `TESTING_IN_PROGRESS`).
- **Verifying CR**:
  - **Pass**: If the CR behaves correctly, click "Testing Passed" to log remarks and sign off.
  - **Fail**: Click "Raise Bug". Log description, steps to reproduce, expected vs actual results. The task changes to `BUG_FOUND`.

---

## 26.2 Administrator Guide

### User & Role Management
- Navigate to the "Users" panel on the Admin Dashboard.
- Admins can create new user accounts, modify role scopes (`ADMIN`, `DEVELOPER`, `TESTER`, `TESTADMIN`), and disable inactive credentials.

### Database Backups
- To create a backup of the relational schemas, execute a mysqldump against the target schema:
  ```bash
  mysqldump -u [username] -p --databases devtrack > devtrack_backup_$(date +%F).sql
  ```

---

## 26.3 Troubleshooting Guide

### 1. JWT / Auth Failures
- **Symptom**: Client receives `401 Unauthorized` or "Invalid JWT signature" errors.
- **Resolution**: Verify that the backend server and frontend client are configured with identical `jwt.secret` signing credentials. Ensure the client browser is storing the returned authorization header properly.

### 2. Database Migration Conflicts (Flyway)
- **Symptom**: Backend fails to launch with a "Migration checksum mismatch" error.
- **Resolution**: Occurs when migration SQL scripts are modified after being applied. In development, run `mvn flyway:repair` or manually repair the Flyway metadata table.

### 3. Database Column Mismatches
- **Symptom**: Exception `Unknown column 't1_0.previous_tester_id' in 'field list'` on startup.
- **Resolution**: Verify all database migration files (V1 through V10) have executed. Check the `flyway_schema_history` table to confirm V10 shows success.
