# Chapter 8: API Documentation

This document describes the REST endpoints exposed by the DevTrack 2.0 backend, specifying the request models, headers, validation constraints, and database side effects.

---

## 8.1 Authentication & Registration Endpoints

### 1. Register User
- **HTTP Method**: `POST`
- **URL**: `/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "username": "tester1",
    "password": "SecurePassword123",
    "fullName": "Alice Tester",
    "email": "tester1@devtrack.com",
    "roles": ["TESTER"]
  }
  ```
- **Validation Rules**:
  - `username`: Not blank, unique, min 4 chars.
  - `password`: Not blank, min 8 chars.
  - `email`: Valid email format.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully."
  }
  ```
- **Failure Response (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "Username already exists."
  }
  ```
- **Business Logic**: Hashes password with BCrypt, saves record to `users` table.

---

## 8.2 Task / CR Endpoints

### 1. Get All Tasks
- **HTTP Method**: `GET`
- **URL**: `/api/tasks`
- **Authentication**: Bearer JWT token required in `Authorization` header.
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "jtrackId": "DT-101",
      "title": "Setup Login Screen",
      "status": "OPEN",
      "priority": "High",
      "assignedDeveloper": { "id": 2, "fullName": "Bob Dev" },
      "tester": null
    }
  ]
  ```

### 2. Assign Tester Atomically
- **HTTP Method**: `POST`
- **URL**: `/api/tasks/{id}/assign-tester`
- **Authentication**: Bearer JWT token. User role must be `TESTER` or `TESTADMIN`.
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "jtrackId": "DT-101",
    "status": "TESTING_IN_PROGRESS",
    "tester": { "id": 3, "fullName": "Alice Tester" },
    "testingStartedDate": "2026-07-01T12:00:00"
  }
  ```
- **Failure Response (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "CR already assigned or not in testing pool."
  }
  ```
- **Database Side Effects**:
  - Updates `tasks` table: sets `tester_id = CURRENT_USER_ID`, `status = 'TESTING_IN_PROGRESS'`, `testing_started_date = NOW()`.
  - Creates record in `audit_logs`.

### 3. Reassign Tester (Admin Only)
- **HTTP Method**: `POST`
- **URL**: `/api/tasks/{id}/reassign-tester`
- **Authentication**: Bearer JWT token. User role must be `ADMIN`.
- **Request Body**:
  ```json
  {
    "newTesterUsername": "tester2",
    "reason": "Initial tester went on leave."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "status": "TESTING_IN_PROGRESS",
    "tester": { "id": 5, "fullName": "Charlie Tester" },
    "previousTester": { "id": 3, "fullName": "Alice Tester" },
    "reassignmentReason": "Initial tester went on leave."
  }
  ```
- **Database Side Effects**:
  - Updates `tasks` table: sets `tester_id = NEW_TESTER_ID`, `previous_tester_id = OLD_TESTER_ID`, `reassignment_reason = REASON`, `reassignment_date = NOW()`, `reassigned_by_id = ADMIN_ID`.
  - Increments `total_retests` on the task.
  - Inserts `audit_logs` record.

---

## 8.3 Bug Endpoints

### 1. Create Bug
- **HTTP Method**: `POST`
- **URL**: `/api/bugs`
- **Authentication**: Bearer JWT token.
- **Request Body**:
  ```json
  {
    "jtrackId": "DT-101",
    "title": "Login crash on blank input",
    "description": "App crashes when submit is clicked without inputs.",
    "severity": "Critical",
    "reason": "NullPointerException in login validation",
    "stepsToReproduce": "1. Go to login page\n2. Click Submit",
    "expectedResult": "Validation error displayed",
    "actualResult": "Blank white screen (app crash)"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 12,
    "title": "Login crash on blank input",
    "status": "OPEN",
    "severity": "Critical",
    "crTaskId": 1
  }
  ```
- **Database Side Effects**:
  - Inserts record into `bugs` table.
  - Updates associated task in `tasks` table: sets `status = 'BUG_FOUND'`, increments `total_bugs_raised`.
  - Inserts `audit_logs` record.
  - Dispatches WebSocket and SMTP email notifications to the assigned developer.
