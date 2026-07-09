# Chapter 9: Workflow Documentation

This document describes the operational workflows, state machines, and approval gates driving DevTrack 2.0.

---

## 9.1 Authentication & Multi-Factor Setup (MFA)
### Workflow Steps
1. User enters username and password.
2. If correct, backend checks if MFA is active:
   - **MFA Active**: Redirects client to `/mfa-verify`. User inputs 6-digit TOTP code. If valid, JWT is generated.
   - **MFA Inactive**: User registers MFA. Backend generates a 32-character secret key, creates a QR code image (using Google Authenticator URI schema), and generates 10 single-use recovery codes.
3. User scans QR code using Microsoft Authenticator or any RFC 6238 app and inputs the first 6-digit token to confirm.
4. Validation success activates MFA flag on user account.

---

## 9.2 Change Request (CR) Lifecycle
```
[Draft Development] --> (Submit Code Review) --> [Code Review (Pending Admin)]
                                                     |
                                   +-----------------+-----------------+
                                   |                                   |
                          (Approved by Admin)                 (Rejected by Admin)
                                   |                                   |
                                   v                                   v
                         [Code Review Done]                  [Changes Requested]
                                   |                                   |
                        (Upload Unit Test Doc)                 (Fix & Resubmit)
                                   v                                   |
                         [Move to UAT / Pool] <------------------------+
                                   |
                         (Tester Self-Assigns)
                                   v
                       [Testing In Progress]
                                   |
                   +---------------+---------------+
                   |                               |
             (Pass Testing)                  (Fail / Raise Bug)
                   |                               |
                   v                               v
          [Testing Completed]                 [Bug Found / Open]
                   |                               |
          (Promote to Prod)                  (Developer Fixes)
                   |                               |
                   v                               v
               [Closed]                      [Bug Resolved]
                                                   |
                                            (Tester Retests)
                                                   v
                                         [Testing In Progress]
```

---

## 9.3 Bug Lifecycle & Retests
- **Raising Bug**: Tester inputs bug details on an assigned CR. Associated task status changes to `BUG_FOUND`. The task's `total_bugs_raised` field is incremented.
- **Resolving Bug**: Developer completes fix, writes comments, and marks as `RESOLVED`.
- **Retesting**: The bug is routed back to the assigning tester. Task returns to `TESTING_IN_PROGRESS`. Tester performs verification. If verified, tester closes the bug. If verified and all bugs on the CR are resolved, UAT testing can be marked passed.

---

## 9.4 Deployment & Releases
- **SIT Deployment**: Handled manually or via webhooks. Developer marks status as `SIT_DEPLOYED`. Audit logs track deployment date.
- **UAT Deployment**: Developer must upload a unit testing document (Base64 file stream) to advance status from `CODE_REVIEW_DONE` to `MOVE_TO_UAT`. Document name and base64 string are stored directly.
- **Prod Promotion**: Admin moves task from `TESTING_COMPLETED` (or `UAT_COMPLETED`) to `CLOSED`. This marks the end of the CR lifecycle.
