# Chapter 14: Notification Documentation

This document describes the notification subsystem, messaging channels, layout templates, and dispatch rules utilized in DevTrack 2.0.

---

## 14.1 Notification Channels

### 1. WebSocket In-App Notifications
- **Protocol**: Raw WebSocket connection managed via a custom endpoint `/ws/notifications`.
- **Implementation**: The handler `NotificationWebSocketHandler` intercepts the handshake, extracts user context, maps connection sessions, and broadcasts dynamic JSON alerts.
- **Payload format**:
  ```json
  {
    "id": 45,
    "title": "Bug Raised",
    "message": "Alice Tester raised Bug DT-101-B1 on your task Setup Login Screen.",
    "type": "BUG_RAISED",
    "timestamp": "2026-07-01T12:00:00"
  }
  ```

### 2. SMTP Email Notifications
- **Implementation**: Managed by the Spring Boot starter mail package. Connects to the configured external SMTP host to dispatch HTML emails.
- **Templates**: Thymeleaf HTML files located under `src/main/resources/templates/mail/`. Includes placeholders for target usernames, task IDs, actions, and redirect links.

---

## 14.2 Recipient Dispatch Rules

| System Event | Primary Recipient | Notification Channel | Content Summary |
|---|---|---|---|
| **CR Submitted for Review** | System Admins | Email + In-App | Alerting admins to review Jtrack CR |
| **CR Code Approved** | Assigned Developer | In-App | Confirmation of review approval |
| **Bug Raised** | Assigned Developer | Email + In-App | Bug details, severity, steps to reproduce |
| **Bug Resolved** | Assigned Tester | In-App | Fix comments, prompting regression test |
| **Tester Assigned** | Developer & Admins | In-App | Notification of tester pick-up |
| **MFA Code Reset** | Target User | Email | Recovery codes generated and sent |

---

## 14.3 Retry & Error Handling Policies
- **Asynchronous Execution**: Email dispatching runs asynchronously (`@Async`) to prevent blocking API response threads.
- **SMTP Failure**: If SMTP connection fails (e.g. timeout, invalid credentials), exceptions are caught, logged via `System.err.println`, and saved in the database under an error audit flag.
- **Fallback**: WebSocket channel remains active if email transport fails.
