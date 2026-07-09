# Chapter 7: Database Documentation

This document describes the schema architecture, column details, relational integrity, constraints, and operational patterns for the database of DevTrack 2.0.

---

## 7.1 Schema Catalog

### 1. `users` Table
- **Purpose**: Holds authenticated accounts and roles.
- **Columns**:
  - `id` (BIGINT, Primary Key, Auto Increment)
  - `username` (VARCHAR(255), Unique, Not Null)
  - `password` (VARCHAR(255), Not Null) - BCrypt hash.
  - `full_name` (VARCHAR(255), Not Null)
  - `email` (VARCHAR(255), Unique, Not Null)
  - `mfa_enabled` (TINYINT(1), Default 0)
  - `mfa_secret` (VARCHAR(255), Nullable)
- **APIs using it**: `/api/auth/login`, `/api/auth/register`, `/api/users`.

### 2. `tasks` Table
- **Purpose**: Stores Change Requests (CRs) and tracking metadata.
- **Columns**:
  - `id` (BIGINT, Primary Key, Auto Increment)
  - `jtrack_id` (VARCHAR(100), Unique, Not Null)
  - `title` (VARCHAR(255), Not Null)
  - `description` (TEXT)
  - `status` (VARCHAR(100), Not Null) - Active status enum string.
  - `priority` (VARCHAR(50), Default 'Medium')
  - `efforts` (INT, Default 0) - Efforts in days.
  - `created_date` (DATETIME, Not Null)
  - `updated_date` (DATETIME)
  - `assigned_developer_id` (BIGINT, Foreign Key -> `users(id)`)
  - `tester_id` (BIGINT, Foreign Key -> `users(id)`)
  - `testing_started_date` (DATETIME)
  - `testing_completed_date` (DATETIME)
  - `testing_duration` (VARCHAR(255))
  - `testing_comments` (VARCHAR(2000))
  - `total_bugs_raised` (INT, Default 0)
  - `total_retests` (INT, Default 0)
  - `reassignment_reason` (VARCHAR(2000))
  - `reassignment_date` (DATETIME)
  - `previous_tester_id` (BIGINT, Foreign Key -> `users(id)`)
  - `reassigned_by_id` (BIGINT, Foreign Key -> `users(id)`)
  - `unit_test_doc_url` (LONGTEXT) - Base64 encoded test document.
  - `unit_test_doc_name` (VARCHAR(512))
- **APIs using it**: `/api/tasks/*`, `/api/tasks/{id}/assign-tester`, `/api/tasks/{id}/reassign-tester`.

### 3. `bugs` Table
- **Purpose**: Logs defects raised during testing on specific CRs.
- **Columns**:
  - `id` (BIGINT, Primary Key, Auto Increment)
  - `cr_task_id` (BIGINT, Foreign Key -> `tasks(id)`)
  - `title` (VARCHAR(255), Not Null)
  - `description` (TEXT)
  - `severity` (VARCHAR(50), Not Null)
  - `status` (VARCHAR(100), Default 'OPEN')
  - `assigned_developer_id` (BIGINT, Foreign Key -> `users(id)`)
  - `raised_by_id` (BIGINT, Foreign Key -> `users(id)`)
  - `created_date` (DATETIME)
  - `updated_date` (DATETIME)
  - `reason` (VARCHAR(2000))
  - `steps_to_reproduce` (VARCHAR(2000))
  - `expected_result` (VARCHAR(2000))
  - `actual_result` (VARCHAR(2000))
- **APIs using it**: `/api/bugs/*`.

### 4. `audit_logs` Table
- **Purpose**: Stores historical system logs.
- **Columns**:
  - `id` (BIGINT, Primary Key, Auto Increment)
  - `entity_type` (VARCHAR(100), Not Null) - e.g. 'TASK', 'BUG', 'USER'
  - `entity_id` (BIGINT, Not Null)
  - `action` (VARCHAR(255), Not Null) - e.g. 'STATUS_CHANGE', 'ASSIGNMENT'
  - `field_name` (VARCHAR(100))
  - `old_value` (TEXT)
  - `new_value` (TEXT)
  - `remarks` (TEXT)
  - `changed_by_username` (VARCHAR(255))
  - `changed_date` (DATETIME, Default CURRENT_TIMESTAMP)
- **APIs using it**: `/api/audit-logs/*`.

---

## 7.2 Entity-Relationship (ER) Diagram (Conceptual)
```
  +--------------+               +------------------+
  |    users     | 1         0..*|      tasks       |
  |--------------|-------------->|------------------|
  | id (PK)      |               | id (PK)          |
  | username     |               | jtrack_id (UK)   |
  | password     |               | status           |
  | email        |               | dev_id (FK)      |
  +--------------+               | tester_id (FK)   |
         |                       +------------------+
         |                                | 1
         |                                |
         | 1                              | 0..*
         |                                v
         |                       +------------------+
         |                       |      bugs        |
         |                       |------------------|
         +---------------------->| id (PK)          |
                                 | cr_task_id (FK)  |
                                 | status           |
                                 | raised_by (FK)   |
                                 +------------------+
```

---

## 7.3 Data Ownership & Lifecycle
- **Who updates data**:
  - **Developers**: Update Task properties when coding, upload Unit Test docs, resolve bugs.
  - **Testers**: Self-assign tasks, update test duration/retests, raise bugs.
  - **Admins**: Add/modify users, reassign tester fields with audit justification, change global statuses.
- **When is it updated**: Triggered instantly on GUI button submission or API REST POST execution.
- **Soft Delete Rules**: Hard deletes are generally avoided for tasks and bugs; records remain in database and are filtered out via UI states.
