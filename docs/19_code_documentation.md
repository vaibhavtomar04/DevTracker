# Chapter 19: Code Documentation

This document serves as a code reference guide for key classes, interfaces, controllers, and services in DevTrack 2.0.

---

## 19.1 Core Controllers

### 1. `TaskController`
- **Purpose**: Exposes REST endpoints to manage CRs, handle pipeline state transitions, assign testers atomically, and upload unit test artifacts.
- **Dependencies**: `TaskRepository`, `UserRepository`, `AuditLogRepository`, `WorkflowExecutionService`.
- **Core Methods**:
  - `assignTesterAtomically(Long id, Principal principal)`
    - **Input**: Task ID (path parameter), Authenticated User principal.
    - **Output**: `ResponseEntity<Task>` containing updated task details.
    - **Exceptions**: `IllegalArgumentException` (task or user not found), `IllegalStateException` (task already assigned or not in pool).
    - **Business Logic**: Queries user using principal, calls repository's atomic assign query. Inserts audit log indicating successful pick-up.
  - `reassignTester(Long id, ReassignTesterRequest request, Principal principal)`
    - **Input**: Task ID (path parameter), `ReassignTesterRequest` payload, Admin User principal.
    - **Output**: `ResponseEntity<Task>` updated.
    - **Exceptions**: `AccessDeniedException` if caller is not an administrator.
    - **Business Logic**: Verifies request user. Updates `tester`, `previousTester`, `reassignmentReason`, `reassignmentDate`, and `reassignedBy` fields. Creates `audit_logs` entry.

---

## 19.2 Core Services

### 1. `WorkflowExecutionService`
- **Purpose**: Core engine that routes a Task's status, checks preconditions, increments bug/retest statistics, and records state dates.
- **Dependencies**: `TaskRepository`, `AuditLogRepository`.
- **Core Methods**:
  - `executeStatusTransition(Task task, String newStatus, String remarks, User operator)`
    - **Input**: Task entity, target status String, mandatory transition remarks, operator User.
    - **Output**: `Task` with updated properties.
    - **Business Logic**: Evaluates current task status and enforces sequential mapping. Saves transition timestamp in audit logs. If transitioning to `TESTING_POOL`, sets `isInPool = true` and resets `tester = null`.

---

## 19.3 Custom Annotations & Configs

### 1. `@Transactional`
- **Usage**: Set on services to guarantee atomic execution. If any database write fail within the block, the entire transaction rolls back to preserve consistency.

### 2. `WebSocketConfig`
- **Purpose**: Implements `WebSocketConfigurer`. Maps the handshake handler to `/ws/notifications` and registers a custom `NotificationWebSocketHandler` bean.
- **Access Control**: Handshake interceptors extract user ID from query strings, validating sessions prior to socket registration.
