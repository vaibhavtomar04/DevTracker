# Chapter 20: UML Diagrams, Flowcharts, and Coding Standards

This document contains visual diagrams mapping system sequences, component architectures, and coding standards.

---

## 20.1 Sequence Diagrams

### 1. Multi-Factor Authentication (MFA) Verification
```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Gateway as API Security Layer
    participant Auth as AuthController
    participant MFA as MfaController
    participant DB as MySQL Database

    User->>Gateway: POST /api/auth/login (credentials)
    Gateway->>DB: Fetch User details
    DB-->>Gateway: User details returned
    Gateway->>Auth: Verify password hash
    alt Credentials invalid
        Auth-->>User: 401 Unauthorized
    else Credentials valid
        alt MFA active on user account
            Auth-->>User: Redirect to MFA verification (with temp session token)
            User->>MFA: POST /api/mfa/verify (6-digit TOTP)
            MFA->>MFA: Calculate HMAC-SHA1 using stored user secret
            alt Token matches (allowing +-1 interval drift)
                MFA->>DB: Generate active JWT access token
                MFA-->>User: Return JWT Token (Auth success)
            else Token invalid
                MFA-->>User: 403 Forbidden (Invalid token)
            end
        else MFA inactive
            Auth-->>User: Return JWT Token (Auth success, redirect to MFA setup)
        end
    end
```

### 2. Tester Self-Assignment Flow
```mermaid
sequenceDiagram
    autonumber
    actor Tester as Tester Dashboard
    participant API as TaskController
    participant Repo as TaskRepository
    participant DB as MySQL Database
    participant WS as WebSocket Handler

    Tester->>API: POST /api/tasks/{id}/assign-tester
    API->>Repo: execute assignTesterAtomically(taskId, testerId)
    Note over Repo, DB: UPDATE tasks SET tester_id = ? ... WHERE id = ? AND status = 'TESTING_POOL' AND tester_id IS NULL
    Repo->>DB: Send query
    DB-->>Repo: Returns affected row count (1 or 0)
    alt Rows affected == 1
        API->>WS: Broadcast TaskStatusChangedEvent
        WS-->>Tester: Refresh queues, status: TESTING_IN_PROGRESS
    else Rows affected == 0 (race condition: another tester assigned first)
        API-->>Tester: Return 400 Bad Request (Conflict)
    end
```

---

## 20.2 Coding Standards & Naming conventions

### Exception Handling Rules
1. Never suppress exceptions with empty catch blocks.
2. In case of unexpected issues, write details to standard error stream (`System.err.println`) or raise a specific runtime exception (e.g. `AccessDeniedException`).
3. Return clean, parsed error models via `GlobalExceptionHandler` to prevent exposing stack traces to the client:
   ```json
   {
     "success": false,
     "message": "Error details here...",
     "timestamp": "2026-07-01T12:00:00"
   }
   ```

### Logging Rules
- System alerts and background logs should output clear chronological messages indicating the entity type, ID, operator, and action executed.
