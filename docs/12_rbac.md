# Chapter 12: Role-Based Access Control (RBAC)

This document maps user roles to specific permission rules and authorization scopes within the DevTrack 2.0 application workspace.

---

## 12.1 Permissions Matrix by Role

| Workspace Action | ADMIN | DEVELOPER | TESTER | TESTADMIN |
|---|:---:|:---:|:---:|:---:|
| **View CR details** | Yes | Yes | Yes | Yes |
| **Create new CR** | Yes | Yes | No | No |
| **Update CR status (Dev States)** | No | Yes (Only Assigned) | No | No |
| **Approve Code Review** | Yes | No | No | No |
| **Deploy/Move to UAT** | No | Yes (Only Assigned) | No | No |
| **Self-Assign Tester** | No | No | Yes | Yes |
| **Reassign Tester** | Yes | No | No | Yes |
| **Upload Unit Test Document** | No | Yes | No | No |
| **Download Unit Test Document** | Yes | Yes | Yes | Yes |
| **Raise Bug** | No | No | Yes | Yes |
| **Resolve Bug** | No | Yes (Only Assigned) | No | No |
| **Close Bug** | No | No | Yes | Yes |
| **Reset MFA Secrets** | Yes | No | No | No |
| **View Audit Logs** | Yes | Yes | Yes | Yes |

---

## 12.2 Workspace Authorization Flow

- **Backend Enforcement**:
  Backend REST controllers use Spring Security annotations (e.g. `@PreAuthorize("hasRole('ADMIN')")` or custom evaluation checks based on task ownership).
  ```java
  @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
  @PostMapping("/{id}/assign-tester")
  public ResponseEntity<?> assignTester(...) { ... }
  ```
- **Frontend Enforcement**:
  The user role is cached in the client session state (`useAuthStore`). Render methods use conditional operators to hide or display buttons:
  ```typescript
  {user?.roles?.includes('ADMIN') && (
    <Button onClick={handleReassign}>Reassign Tester</Button>
  )}
  ```
- **Future Roles**:
  The database schema stores roles as collections of strings, enabling simple future additions of roles such as `PROJECT_MANAGER` or `RELEASE_ENGINEER` by adding new entries to the user role mappings without schema modifications.
