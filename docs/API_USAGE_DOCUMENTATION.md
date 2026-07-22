# DevTracker 2.0 - Complete API Usage Documentation

> **Version:** 2.0  
> **Base URL:** `http://localhost:8080`  
> **Authentication:** Bearer JWT Token (`Authorization: Bearer <token>`)  
> **Postman Collection:** [DevTracker_2.0_Postman_Collection.json](file:///d:/Vaibhav/DevTracker 2.0/docs/DevTracker_2.0_Postman_Collection.json)

## Overview

This document provides a comprehensive specification and usage guide for all **196 API endpoints** implemented in **DevTracker 2.0**. DevTracker is an enterprise software development tracking, bug management, QA testing, and team performance analytics system.

### Quick Index of API Modules

1. [17. Analytics & Performance Metrics](#17-analytics--performance-metrics) (3 APIs)
2. [13. File Attachments](#13-file-attachments) (5 APIs)
3. [22. Audit Groups](#22-audit-groups) (3 APIs)
4. [21. System Audit Logs](#21-system-audit-logs) (3 APIs)
5. [1. Authentication & Session Management](#1-authentication--session-management) (11 APIs)
6. [5. Bug & Issue Tracking](#5-bug--issue-tracking) (24 APIs)
7. [6. Bug Review & QA Approvals](#6-bug-review--qa-approvals) (12 APIs)
8. [7. Bug Sub-Tasks](#7-bug-sub-tasks) (6 APIs)
9. [14. Comments & Collaboration](#14-comments--collaboration) (3 APIs)
10. [26. Application Configuration](#26-application-configuration) (4 APIs)
11. [12. Document Management](#12-document-management) (6 APIs)
12. [16. Leaderboards & Rankings](#16-leaderboards--rankings) (4 APIs)
13. [2. Multi-Factor Authentication (MFA)](#2-multi-factor-authentication-mfa) (10 APIs)
14. [23. Notifications](#23-notifications) (9 APIs)
15. [18. Quality & Risk Assessment](#18-quality--risk-assessment) (3 APIs)
16. [15. Developer Gamification & Recognition](#15-developer-gamification--recognition) (14 APIs)
17. [19. Reports & Exports](#19-reports--exports) (2 APIs)
18. [20. Asynchronous Report Jobs](#20-asynchronous-report-jobs) (4 APIs)
19. [8. Sprint Management](#8-sprint-management) (7 APIs)
20. [9. Sprint Tasks & Dependencies](#9-sprint-tasks--dependencies) (11 APIs)
21. [4. Task Management & Workflows](#4-task-management--workflows) (27 APIs)
22. [25. Task Types](#25-task-types) (4 APIs)
23. [10. Test Cases & Execution](#10-test-cases--execution) (4 APIs)
24. [11. Tester Workspace](#11-tester-workspace) (3 APIs)
25. [3. User Management](#3-user-management) (7 APIs)
26. [24. Workflow Definitions](#24-workflow-definitions) (7 APIs)

---

## 17. Analytics & Performance Metrics

*Productivity analytics, velocity charts, bug resolution rates, and team metrics.*

### `GET` `/api/analytics/api/analytics`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/analytics/api/analytics.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/analytics/dashboard`

**Java Method:** `getDashboardData`  
**Description & Usage:** Handles the getDashboardData action for /api/analytics/dashboard.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/analytics/deadlines`

**Java Method:** `getDeadlineAnalytics`  
**Description & Usage:** Handles the getDeadlineAnalytics action for /api/analytics/deadlines.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 13. File Attachments

*Uploading, downloading, viewing, and deleting file attachments associated with tasks or bugs.*

### `GET` `/api/attachments/api/attachments`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/attachments/api/attachments.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/attachments/upload`

**Java Method:** `uploadAttachment`  
**Description & Usage:** Handles the uploadAttachment action for /api/attachments/upload.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `file` | `MultipartFile` | `Yes` | `-` | Filter/Option for query |
| `entityType` | `String` | `Yes` | `-` | Filter/Option for query |
| `entityId` | `Long` | `Yes` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/attachments/{entityType}/{entityId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/attachments/{entityType}/{entityId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/attachments/download/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/attachments/download/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/attachments/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/attachments/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 22. Audit Groups

*Audit groups, team assignments, and target compliance groups.*

### `GET` `/api/audit/groups/api/audit/groups`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/audit/groups/api/audit/groups.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/audit/groups/{entityType}/{entityId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/audit/groups/{entityType}/{entityId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/audit/groups/{entityType}/{entityId}/export`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/audit/groups/{entityType}/{entityId}/export.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 21. System Audit Logs

*System-wide security and operational audit trail logs.*

### `GET` `/api/audit/api/audit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/audit/api/audit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/audit`

**Java Method:** `getAllAuditLogs`  
**Description & Usage:** Handles the getAllAuditLogs action for /api/audit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/audit/{entityType}/{entityId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/audit/{entityType}/{entityId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 1. Authentication & Session Management

*Endpoints for User Login, Registration, JWT Token Refresh, Logout, Profile Management, and Password operations.*

### `GET` `/api/auth/api/auth`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/auth/api/auth.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/login`

**Java Method:** `authenticateUser`  
**Description & Usage:** Handles the authenticateUser action for /api/auth/login.

**Authentication:** None (Public Endpoint)

#### Request Body (`application/json`)

**Payload DTO Type:** `LoginRequest`

```json
{
  "username": "admin",
  "password": "password123"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/admin/create-user`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/auth/admin/create-user.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/auth/me`

**Java Method:** `getCurrentUser`  
**Description & Usage:** Handles the getCurrentUser action for /api/auth/me.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/refreshtoken`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/auth/refreshtoken.

**Authentication:** None (Public Endpoint)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/logout`

**Java Method:** `logoutUser`  
**Description & Usage:** Handles the logoutUser action for /api/auth/logout.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/set-new-password`

**Java Method:** `setNewPassword`  
**Description & Usage:** Handles the setNewPassword action for /api/auth/set-new-password.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "key": "value"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/auth/microsoft/config`

**Java Method:** `getMicrosoftConfig`  
**Description & Usage:** Handles the getMicrosoftConfig action for /api/auth/microsoft/config.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/microsoft/login`

**Java Method:** `microsoftLogin`  
**Description & Usage:** Handles the microsoftLogin action for /api/auth/microsoft/login.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "key": "value"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/forgot-password`

**Java Method:** `forgotPassword`  
**Description & Usage:** Handles the forgotPassword action for /api/auth/forgot-password.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "key": "value"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/auth/reset-password`

**Java Method:** `resetPassword`  
**Description & Usage:** Handles the resetPassword action for /api/auth/reset-password.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "key": "value"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 5. Bug & Issue Tracking

*Bug reporting, severity triage, developer fix assignments, tester verification, workflow steps, and mail threads.*

### `GET` `/api/bugs/api/bugs`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/api/bugs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs`

**Java Method:** `getAllBugs`  
**Description & Usage:** Handles the getAllBugs action for /api/bugs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `Integer` | `No` | `-` | Filter/Option for query |
| `size` | `Integer` | `No` | `-` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `severity` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/download-bugs`

**Java Method:** `downloadBugs`  
**Description & Usage:** Handles the downloadBugs action for /api/bugs/download-bugs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `severity` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/my`

**Java Method:** `getMyBugs`  
**Description & Usage:** Handles the getMyBugs action for /api/bugs/my.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `10` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `severity` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/{bugId}/artifacts/{artId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{bugId}/artifacts/{artId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs`

**Java Method:** `createBug`  
**Description & Usage:** Handles the createBug action for /api/bugs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Bug`

```json
{
  "title": "NullPointerException on Login attempt",
  "description": "User login fails when email has uppercase letters",
  "severity": "CRITICAL",
  "status": "OPEN",
  "taskId": 1,
  "assignedDeveloperId": 2,
  "assignedTesterId": 3,
  "environment": "STAGING"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/bugs/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/bugs/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/{id}/current-step`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/current-step.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/{id}/steps`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/steps.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/push-to-pool`

**Java Method:** `endpoint`  
**Description & Usage:** UAT and Pool Endpoints

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/pick-from-pool`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/pick-from-pool.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/pick-for-sit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/pick-for-sit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/approve-sit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/approve-sit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/reject-sit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/reject-sit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/pick-for-uat`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/pick-for-uat.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/approve-uat`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/approve-uat.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/reject-uat`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/reject-uat.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/approve-invalid`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/approve-invalid.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/reject-invalid`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/reject-invalid.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugs/{id}/fix-summary`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/fix-summary.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/{id}/fix-summary`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/{id}/fix-summary.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugs/cr/{crId}/fix-summaries`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugs/cr/{crId}/fix-summaries.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 6. Bug Review & QA Approvals

*Bug fix review submissions, peer reviews, approval/rejection workflows, and developer summaries.*

### `GET` `/api/bug-reviews/api/bug-reviews`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/api/bug-reviews.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews`

**Java Method:** `proposeBugReview`  
**Description & Usage:** Handles the proposeBugReview action for /api/bug-reviews.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `BugReviewProposedDto`

```json
{
  "bugId": 1,
  "proposedStatus": "RESOLVED",
  "reviewNotes": "Fixed case-sensitivity issue in AuthService",
  "developerSummary": "Updated String.toLowerCase() before comparison"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/accept`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/accept.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/reject`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/reject.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/tester-accept`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/tester-accept.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/raise-again`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/raise-again.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/challenge`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/challenge.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/admin-accept`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/admin-accept.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bug-reviews/{id}/admin-force`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}/admin-force.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bug-reviews/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bug-reviews/cr/{crId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bug-reviews/cr/{crId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bug-reviews`

**Java Method:** `getAllBugReviews`  
**Description & Usage:** Handles the getAllBugReviews action for /api/bug-reviews.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 7. Bug Sub-Tasks

*Granular sub-tasks associated with resolving complex bugs.*

### `GET` `/api/bugtasks/api/bugtasks`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugtasks/api/bugtasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugtasks`

**Java Method:** `getAllBugTasks`  
**Description & Usage:** Handles the getAllBugTasks action for /api/bugtasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/bugtasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugtasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/bugtasks`

**Java Method:** `createBugTask`  
**Description & Usage:** Handles the createBugTask action for /api/bugtasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `BugTask`

```json
{
  "title": "Fix NullPointerException in login",
  "description": "Ensure email is normalized before query",
  "bugId": 1,
  "assignedUserId": 2,
  "estimatedHours": 4.0
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/bugtasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugtasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/bugtasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/bugtasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 14. Comments & Collaboration

*Collaborative comments on tasks and bugs for developer-tester communication.*

### `GET` `/api/comments/api/comments`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/comments/api/comments.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/comments/{entityType}/{entityId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/comments/{entityType}/{entityId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/comments`

**Java Method:** `addComment`  
**Description & Usage:** Handles the addComment action for /api/comments.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Comment`

```json
{
  "content": "Code review completed. Looks good to merge!",
  "taskId": 1
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 26. Application Configuration

*Global system configurations, settings, feature flags, and app parameters.*

### `GET` `/api/configs/api/configs`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/configs/api/configs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/configs`

**Java Method:** `getAllConfigs`  
**Description & Usage:** Handles the getAllConfigs action for /api/configs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/configs/{key}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/configs/{key}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/configs`

**Java Method:** `createOrUpdateConfig`  
**Description & Usage:** Handles the createOrUpdateConfig action for /api/configs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `AppConfig`

```json
{
  "data": "sample_payload"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 12. Document Management

*Technical documentation, architecture docs, versioning, and document attachments tied to tasks.*

### `POST` `/api/crs/{crId}/documents`

**Java Method:** `endpoint`  
**Description & Usage:** ── UPLOAD ─────────────────────────────────────────────────────── Uploads a document for a CR. Accepts: multipart/form-data with fields: file     — the raw file docType  — BRD | API_DOC | DESIGN | SUPPORT Returns DocumentDto (metadata only — no bytes). Errors: 400 validation, 404 CR not found, 413 too large, 415 bad MIME.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/crs/{crId}/documents`

**Java Method:** `endpoint`  
**Description & Usage:** ── LIST ───────────────────────────────────────────────────────── Returns metadata list for all non-deleted documents attached to a CR.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/documents/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** ── SINGLE METADATA ──────────────────────────────────────────────

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/documents/{id}/download`

**Java Method:** `endpoint`  
**Description & Usage:** ── DOWNLOAD (STREAM) ──────────────────────────────────────────── Streams raw bytes with correct Content-Type and Content-Disposition headers. Bytes are never buffered in controller memory — DocumentService writes directly to HttpServletResponse's OutputStream.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/auth/documents/{id}/download`

**Java Method:** `endpoint`  
**Description & Usage:** Public download endpoint for email clients — permitted via WebSecurityConfig /api/auth/**

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/documents/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** ── SOFT DELETE ──────────────────────────────────────────────────

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 16. Leaderboards & Rankings

*Developer and tester velocity leaderboards, point rankings, and historical snapshots.*

### `GET` `/api/recognition/leaderboard/api/recognition/leaderboard`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/recognition/leaderboard/api/recognition/leaderboard.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/leaderboard`

**Java Method:** `leaderboard`  
**Description & Usage:** GET /api/recognition/leaderboard?period=ALL_TIME|MONTHLY|QUARTERLY&size=10 Returns ranked users by total_score descending. Period filtering is handled on the score aggregate — the score row is always "all-time" by spec; period rows are future extension points.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `10` | Filter/Option for query |
| `period` | `String` | `Yes` | `ALL_TIME` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/leaderboard/top`

**Java Method:** `topN`  
**Description & Usage:** GET /api/recognition/leaderboard/top?limit=5 Quick-access top-N for dashboard widgets (no auth required beyond login).

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `limit` | `int` | `Yes` | `5` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/leaderboard/achievements`

**Java Method:** `achievementRanking`  
**Description & Usage:** GET /api/recognition/leaderboard/achievements?limit=10 Users ranked by achievement count (rarity-weighted).

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `limit` | `int` | `Yes` | `10` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 2. Multi-Factor Authentication (MFA)

*Endpoints for configuring, enabling, verifying 2FA/MFA via TOTP, managing backup codes and trusted devices.*

### `GET` `/api/mfa/api/mfa`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/mfa/api/mfa.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/mfa/enable`

**Java Method:** `enableMfa`  
**Description & Usage:** Handles the enableMfa action for /api/mfa/enable.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/mfa/qr`

**Java Method:** `getQrPayload`  
**Description & Usage:** Handles the getQrPayload action for /api/mfa/qr.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/mfa/verify`

**Java Method:** `verifyMfa`  
**Description & Usage:** Handles the verifyMfa action for /api/mfa/verify.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "code": "123456"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/mfa/disable`

**Java Method:** `disableMfa`  
**Description & Usage:** Handles the disableMfa action for /api/mfa/disable.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "code": "123456"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/mfa/backup-codes`

**Java Method:** `generateBackupCodes`  
**Description & Usage:** Handles the generateBackupCodes action for /api/mfa/backup-codes.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/mfa/backup-codes/verify`

**Java Method:** `verifyBackupCode`  
**Description & Usage:** Handles the verifyBackupCode action for /api/mfa/backup-codes/verify.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "code": "123456"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/mfa/trusted-devices`

**Java Method:** `getTrustedDevices`  
**Description & Usage:** Handles the getTrustedDevices action for /api/mfa/trusted-devices.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/mfa/trusted-devices/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/mfa/trusted-devices/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/mfa/admin/reset/{userId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/mfa/admin/reset/{userId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 23. Notifications

*Real-time user notifications, unread counts, marking as read, and notification preferences.*

### `GET` `/api/notifications/api/notifications`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/notifications/api/notifications.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/notifications`

**Java Method:** `getAllNotifications`  
**Description & Usage:** Handles the getAllNotifications action for /api/notifications.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/notifications/for-user/{userId}`

**Java Method:** `endpoint`  
**Description & Usage:** User-scoped notifications — active and sorted.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/notifications/pin/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/notifications/pin/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/notifications/snooze/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/notifications/snooze/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/notifications`

**Java Method:** `createNotification`  
**Description & Usage:** Creates a notification and immediately pushes it via WebSocket to the target user's active browser sessions.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Notification`

```json
{
  "data": "sample_payload"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/notifications/read/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/notifications/read/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/notifications/read-all/{userId}`

**Java Method:** `endpoint`  
**Description & Usage:** Mark all notifications for a user as read in one call.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/notifications/clear/{userId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/notifications/clear/{userId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 18. Quality & Risk Assessment

*Quality risk calculations, risk indicators for software releases, and historical risk trends.*

### `GET` `/api/api`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/api.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/crs/{id}/quality-risk`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/crs/{id}/quality-risk.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/quality-risk/at-risk`

**Java Method:** `getAtRiskCrs`  
**Description & Usage:** Handles the getAtRiskCrs action for /api/quality-risk/at-risk.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `10` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 15. Developer Gamification & Recognition

*Kudos, developer badges, peer endorsements, achievements, and gamified recognition rewards.*

### `GET` `/api/recognition/api/recognition`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/recognition/api/recognition.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/my/score`

**Java Method:** `myScore`  
**Description & Usage:** GET /api/recognition/my/score — caller's recognition score + level

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/users/{id}/score`

**Java Method:** `endpoint`  
**Description & Usage:** GET /api/recognition/users/{id}/score — any user's score (view only)

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/my/achievements`

**Java Method:** `myAchievements`  
**Description & Usage:** GET /api/recognition/my/achievements — caller's unlocked achievements

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `20` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/my/achievements/progress`

**Java Method:** `myProgress`  
**Description & Usage:** GET /api/recognition/my/achievements/progress — achievement progress list

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/users/{id}/achievements`

**Java Method:** `endpoint`  
**Description & Usage:** GET /api/recognition/users/{id}/achievements — any user's achievements

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/achievements`

**Java Method:** `catalogue`  
**Description & Usage:** GET /api/recognition/achievements — catalogue of all achievements

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `50` | Filter/Option for query |
| `category` | `String` | `No` | `-` | Filter/Option for query |
| `rarity` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/categories`

**Java Method:** `categories`  
**Description & Usage:** GET /api/recognition/categories — achievement categories

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/my/notifications`

**Java Method:** `myNotifications`  
**Description & Usage:** GET /api/recognition/my/notifications

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `20` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/my/notifications/unread-count`

**Java Method:** `unreadCount`  
**Description & Usage:** GET /api/recognition/my/notifications/unread-count

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/recognition/my/notifications/mark-read`

**Java Method:** `markAllRead`  
**Description & Usage:** POST /api/recognition/my/notifications/mark-read

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/recognition/admin/grant-achievement`

**Java Method:** `adminGrant`  
**Description & Usage:** POST /api/recognition/admin/grant-achievement Body: { userId, achievementCode, reason } Used for admin-verified achievements (mentoring, certifications, etc.)

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "key": "value"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/recognition/admin/recalculate/{userId}`

**Java Method:** `endpoint`  
**Description & Usage:** POST /api/recognition/admin/recalculate/{userId} Forces a full score recalculation for a user (admin only). Use after data migrations or manual corrections.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/recognition/admin/equity-audit`

**Java Method:** `getEquityAudit`  
**Description & Usage:** GET /api/recognition/admin/equity-audit Evaluates Gini coefficient and rank concentration to detect privilege skew or bias.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 19. Reports & Exports

*Generates PDF, Excel, and CSV summary reports for executive dashboard and sprint summaries.*

### `GET` `/api/reports/api/reports`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/reports/api/reports.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/reports/metrics`

**Java Method:** `getMetrics`  
**Description & Usage:** Handles the getMetrics action for /api/reports/metrics.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `startDate` | `String` | `No` | `-` | Filter/Option for query |
| `endDate` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 20. Asynchronous Report Jobs

*Asynchronous report generation job scheduling, status polling, and report download links.*

### `GET` `/api/reports/api/reports`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/reports/api/reports.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/reports/export`

**Java Method:** `requestReport`  
**Description & Usage:** Handles the requestReport action for /api/reports/export.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `type` | `String` | `Yes` | `TASKS` | Filter/Option for query |
| `format` | `String` | `Yes` | `xlsx` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/reports/jobs/{jobId}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/reports/jobs/{jobId}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/reports/download/{token}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/reports/download/{token}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 8. Sprint Management

*Agile sprint creation, backlog planning, sprint tracking, and milestone completion.*

### `GET` `/api/sprints/api/sprints`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprints/api/sprints.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/sprints`

**Java Method:** `getAllSprints`  
**Description & Usage:** Handles the getAllSprints action for /api/sprints.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/sprints`

**Java Method:** `createSprint`  
**Description & Usage:** Handles the createSprint action for /api/sprints.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Sprint`

```json
{
  "name": "Sprint 2026-Q3-S1",
  "startDate": "2026-08-01",
  "endDate": "2026-08-15",
  "goal": "Deliver MVP Auth and Task Workflows"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/sprints/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprints/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/sprints/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprints/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/sprints/{id}/start`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprints/{id}/start.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/sprints/{id}/complete`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprints/{id}/complete.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 9. Sprint Tasks & Dependencies

*Tasks tied to specific sprints, task dependency graphs, prerequisite linking, and linking Change Requests (CRs).*

### `GET` `/api/api`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/api.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/sprint-tasks`

**Java Method:** `getAllSprintTasks`  
**Description & Usage:** Handles the getAllSprintTasks action for /api/sprint-tasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `sprintId` | `Long` | `No` | `-` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `priority` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/sprint-tasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprint-tasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/sprint-tasks`

**Java Method:** `createSprintTask`  
**Description & Usage:** Handles the createSprintTask action for /api/sprint-tasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `SprintTaskDto`

```json
{
  "title": "Build Auth Module",
  "description": "Implement JWT and Spring Security integration",
  "assignedUserId": 1,
  "estimatedHours": 16.0,
  "sprintId": 1,
  "priority": "HIGH"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/sprint-tasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprint-tasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/sprint-tasks/{id}/complete`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprint-tasks/{id}/complete.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/sprint-tasks/{id}/dependencies`

**Java Method:** `endpoint`  
**Description & Usage:** Dependencies

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/sprint-tasks/{id}/dependencies`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprint-tasks/{id}/dependencies.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/sprint-tasks/{id}/dependencies`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/sprint-tasks/{id}/dependencies.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/sprints/{id}/task-dependency-graph`

**Java Method:** `endpoint`  
**Description & Usage:** Graph

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/crs/{id}/link-sprint-tasks`

**Java Method:** `endpoint`  
**Description & Usage:** CR task links

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 4. Task Management & Workflows

*Core task lifecycle management: creation, status updates, assigning developers/testers, workflow approvals, and exporting unit test docs.*

### `GET` `/api/tasks/api/tasks`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/api/tasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks`

**Java Method:** `getAllTasks`  
**Description & Usage:** Handles the getAllTasks action for /api/tasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `Integer` | `No` | `-` | Filter/Option for query |
| `size` | `Integer` | `No` | `-` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `priority` | `String` | `No` | `-` | Filter/Option for query |
| `search` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/download-tasks`

**Java Method:** `downloadTasks`  
**Description & Usage:** Handles the downloadTasks action for /api/tasks/download-tasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `priority` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/my`

**Java Method:** `getMyTasks`  
**Description & Usage:** Handles the getMyTasks action for /api/tasks/my.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `10` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |
| `priority` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks`

**Java Method:** `createTask`  
**Description & Usage:** Handles the createTask action for /api/tasks.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Task`

```json
{
  "title": "Implement User Management API",
  "description": "Create CRUD endpoints for user accounts and roles",
  "status": "OPEN",
  "priority": "HIGH",
  "type": "FEATURE",
  "assignedUserId": 2,
  "sprintId": 1,
  "estimatedHours": 8.0
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/tasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/tasks/{id}/sprint`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/sprint.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/assign-tester`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/assign-tester.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/reassign-tester`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/reassign-tester.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/complete-testing`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/complete-testing.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/export`

**Java Method:** `exportTasksToExcel`  
**Description & Usage:** Handles the exportTasksToExcel action for /api/tasks/export.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/tasks/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/{id}/download-unit-test-doc`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/download-unit-test-doc.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/push-to-pool`

**Java Method:** `endpoint`  
**Description & Usage:** UAT and Pool Endpoints

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/pick-from-pool`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/pick-from-pool.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/pick-for-sit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/pick-for-sit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/approve-sit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/approve-sit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/reject-sit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/reject-sit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/pick-for-uat`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/pick-for-uat.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/approve-uat`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/approve-uat.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/reject-uat`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/reject-uat.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/{id}/current-step`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/current-step.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/{id}/steps`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/steps.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tasks/current`

**Java Method:** `getTasksByStepType`  
**Description & Usage:** Dynamic Workflow Endpoints

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `type` | `String` | `Yes` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/approve`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/approve.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tasks/{id}/reject`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tasks/{id}/reject.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 25. Task Types

*Custom task types (Feature, Bug, CR, Refactor, Maintenance) definitions.*

### `GET` `/api/task-types/api/task-types`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/task-types/api/task-types.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/task-types`

**Java Method:** `getAllTaskTypes`  
**Description & Usage:** Handles the getAllTaskTypes action for /api/task-types.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/task-types`

**Java Method:** `createTaskType`  
**Description & Usage:** Handles the createTaskType action for /api/task-types.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `TaskType`

```json
{
  "name": "CR (Change Request)",
  "description": "Change Request Task Type"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/task-types/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/task-types/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 10. Test Cases & Execution

*Test case definitions, execution statuses, and association with developer tasks or reported bugs.*

### `GET` `/api/test-cases/api/test-cases`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/test-cases/api/test-cases.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/test-cases`

**Java Method:** `getAllTestCases`  
**Description & Usage:** Handles the getAllTestCases action for /api/test-cases.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/test-cases`

**Java Method:** `createTestCase`  
**Description & Usage:** Handles the createTestCase action for /api/test-cases.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `TestCase`

```json
{
  "title": "Verify Login with Valid Credentials",
  "description": "User enters correct username and password and clicks submit",
  "expectedResult": "User receives 200 OK and valid JWT token",
  "taskId": 1,
  "status": "PASSED"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/test-cases/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/test-cases/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 11. Tester Workspace

*Dedicated workbench for QA Testers to review pending items, log test results, and track testing metrics.*

### `GET` `/api/tester-workspace/api/tester-workspace`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/tester-workspace/api/tester-workspace.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/tester-workspace/tested-crs`

**Java Method:** `getTestedCrs`  
**Description & Usage:** Handles the getTestedCrs action for /api/tester-workspace/tested-crs.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `page` | `int` | `Yes` | `0` | Filter/Option for query |
| `size` | `int` | `Yes` | `50` | Filter/Option for query |
| `sort` | `String` | `Yes` | `testingCompletedDate,desc` | Filter/Option for query |
| `search` | `String` | `No` | `-` | Filter/Option for query |
| `project` | `String` | `No` | `-` | Filter/Option for query |
| `sprintId` | `Long` | `No` | `-` | Filter/Option for query |
| `priority` | `String` | `No` | `-` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/tester-workspace/tested-crs/export`

**Java Method:** `exportTestedCrs`  
**Description & Usage:** Handles the exportTestedCrs action for /api/tester-workspace/tested-crs/export.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Query Parameters

| Parameter | Type | Required | Default Value | Description |
|---|---|---|---|---|
| `search` | `String` | `No` | `-` | Filter/Option for query |
| `project` | `String` | `No` | `-` | Filter/Option for query |
| `sprintId` | `Long` | `No` | `-` | Filter/Option for query |
| `priority` | `String` | `No` | `-` | Filter/Option for query |
| `status` | `String` | `No` | `-` | Filter/Option for query |

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 3. User Management

*Endpoints for querying system users, profiles, role assignments, and team member management.*

### `GET` `/api/users/api/users`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/users/api/users.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/users`

**Java Method:** `getAllUsers`  
**Description & Usage:** Handles the getAllUsers action for /api/users.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/users/profile`

**Java Method:** `updateProfile`  
**Description & Usage:** Handles the updateProfile action for /api/users/profile.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `ProfileUpdateRequest`

```json
{
  "fullName": "John Developer Updated",
  "email": "john.updated@company.com"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/users/theme`

**Java Method:** `updateTheme`  
**Description & Usage:** Handles the updateTheme action for /api/users/theme.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Map<String,`

```json
{
  "key": "value"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/users/{id}/status`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/users/{id}/status.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/users/{id}/roles`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/users/{id}/roles.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/users/{id}/status-audit`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/users/{id}/status-audit.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## 24. Workflow Definitions

*Configurable workflow pipeline definitions, steps, and process types.*

### `GET` `/api/workflows/api/workflows`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/workflows/api/workflows.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/workflows`

**Java Method:** `getAllWorkflows`  
**Description & Usage:** Handles the getAllWorkflows action for /api/workflows.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/workflows/type/{type}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/workflows/type/{type}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `POST` `/api/workflows`

**Java Method:** `createWorkflow`  
**Description & Usage:** Handles the createWorkflow action for /api/workflows.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Request Body (`application/json`)

**Payload DTO Type:** `Workflow`

```json
{
  "name": "Standard Code Review Workflow",
  "type": "TASK",
  "description": "Workflow for standard developer task approval"
}
```

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `GET` `/api/workflows/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/workflows/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `PUT` `/api/workflows/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/workflows/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

### `DELETE` `/api/workflows/{id}`

**Java Method:** `endpoint`  
**Description & Usage:** Handles the endpoint action for /api/workflows/{id}.

**Authentication:** Required (`Bearer <JWT Token>`)

#### Expected Response

- **Success Status:** `200 OK` (or `201 Created` / `204 No Content`)
- **Error Statuses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---
