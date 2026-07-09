# Chapter 16: Audit Logging

This document details the system auditing engine, tracking models, logging triggers, and metadata captured for every critical user operation in DevTrack 2.0.

---

## 16.1 Audited Events

The following activities trigger synchronous audit records:
- **Authentication**: Successful logins, MFA validation, failed attempts, and password resets.
- **CR Lifecycle**: Stage movements (e.g. `SIT_DEPLOYED`, `MOVE_TO_UAT`, `CLOSED`).
- **Tester Assignment**: Atomic self-assignments, reassignments (logs reason and admin user), and testing completions.
- **Bug Workflows**: Creation of defects, status updates, resolutions, and closures.
- **Files**: Document uploads and downloads.

---

## 16.2 Schema & Properties Catalog
Audit logs are stored in the `audit_logs` table. Each entry maps the following properties:

| Field Name | Type | Description |
|---|---|---|
| `id` | BIGINT | Auto-increment primary key. |
| `entity_type` | VARCHAR | Entity classification (e.g. `TASK`, `BUG`, `USER`). |
| `entity_id` | BIGINT | Identifier of the changed object. |
| `action` | VARCHAR | Verb describing the operation (e.g. `STATUS_CHANGE`, `ASSIGNMENT`). |
| `field_name` | VARCHAR | Specific attribute modified (e.g. `status`, `tester_id`, `mfa_enabled`). |
| `old_value` | TEXT | Value before modification (null if new entity creation). |
| `new_value` | TEXT | Value after modification. |
| `remarks` | TEXT | Transition comments, admin reason, or system messages. |
| `changed_by_username` | VARCHAR | Username of the authenticated trigger source. |
| `changed_date` | DATETIME | Timestamp of change execution. |

---

## 16.3 Logging Mechanics
- **Backend Service Integration**:
  The `AuditLogService` or `TaskController` creates records transactionally:
  ```java
  AuditLog log = new AuditLog();
  log.setEntityType("TASK");
  log.setEntityId(task.getId());
  log.setAction("STATUS_CHANGE");
  log.setFieldName("status");
  log.setOldValue(oldStatus);
  log.setNewValue(newStatus);
  log.setRemarks(remarks);
  log.setChangedByUsername(currentUser.getUsername());
  auditLogRepository.save(log);
  ```
- **Auditing UI**:
  Admins can query the global audit history page (`audits.tsx`), which lists actions sequentially, filterable by date range, action type, and username.
