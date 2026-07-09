# Chapter 2: Functional Requirement Specification (FRS)

This document specifies the functional requirements, user stories, acceptance criteria, rules, and exceptions for the core feature modules of DevTrack 2.0.

---

## 2.1 User Authentication & Multi-Factor Authentication (MFA)
### Description
Users must authenticate securely using their credentials. If MFA is enabled for the account, they must submit a valid Time-based One-Time Password (TOTP) from an authenticator application.

### User Story
*As a DevTrack 2.0 user, I want to log in using my credentials and MFA token, so that my account and workspace remain secure.*

### Acceptance Criteria
- Login screen must prompt for Username and Password.
- If MFA is active, user must be redirected to an MFA verification screen to input a 6-digit code.
- If MFA is not setup, the user is prompted to scan a QR code and set up MFA.
- Providing 10 recovery codes for download on first setup.

### Preconditions
- User account exists in the database.
- User is active.

### Postconditions
- JWT access and refresh tokens generated and stored in the client session.
- User is redirected to their role-specific dashboard workspace.

### Validation & Business Rules
- Username and password fields cannot be blank.
- The MFA token must be exactly 6 digits.
- The backend verifies TOTP using an RFC 6238-compliant algorithm with a time-step window of 30 seconds (allowing $\pm 1$ step clock drift).

### Exceptions
- Incorrect credentials return a generic `401 Unauthorized` response.
- Expired or invalid MFA tokens block login.
- Locked accounts due to excessive failed attempts block login.

### Success Criteria
- User successfully reaches their specific dashboard within 2 seconds.

---

## 2.2 Change Request (CR) Lifecycle & Pipeline Transitions
### Description
Allows developers to raise Change Requests (CRs), track them through environments (SIT, UAT), submit code reviews for approval, and promote them to Production.

### User Story
*As a Developer, I want to create a CR and advance it through pipeline gates, so that my code changes are audited, verified, and safely deployed.*

### Acceptance Criteria
- CR must contain Jtrack ID, Title, Project, Sprint, Category, Priority, and Description.
- Sequential gates: `OPEN` -> `IN_PROGRESS` -> `SIT_DEPLOYED` -> `SIT_COMPLETED` -> `CODE_REVIEW` -> `CODE_REVIEW_DONE` -> `MOVE_TO_UAT` -> `TESTING_POOL` -> `TESTING_IN_PROGRESS` -> `TESTING_COMPLETED` -> `CLOSED`.
- Uploading unit testing documents (Base64 file stream) is mandatory when pushing from `CODE_REVIEW_DONE` to `MOVE_TO_UAT`.

### Preconditions
- Developer is authenticated.
- Target project and sprint are active.

### Postconditions
- CR table record updated with new status, transition dates, and audit log.
- Notification sent to relevant parties (Admins, Reviewers, or Testers).

### Validation & Business Rules
- Jtrack ID must start with a valid prefix (e.g. `DT-` or `J-`) and be unique.
- Title and description must not be blank.
- Rejection during code review resets status to `IN_PROGRESS` and captures admin remarks.

### Exceptions
- Attempting to bypass workflow gates throws a validation exception.
- Missing unit testing documents blocks UAT push.

### Success Criteria
- Status transition takes place and updates dashboard states immediately.

---

## 2.3 Tester Assignment & UAT Testing
### Description
Once a CR is moved to UAT, it enters a shared Testing Pool. Testers self-assign CRs atomically. Only the assigned tester can test, raise bugs, or sign off on that CR.

### User Story
*As a Tester, I want to assign a CR to myself from the pool, so that I have exclusive ownership of its testing lifecycle.*

### Acceptance Criteria
- Shared pool is visible to all testers.
- "Assign to Me" button assigns the tester atomically.
- Once assigned, CR moves to "My Assigned Testing" tab and status updates to `TESTING_IN_PROGRESS`.
- If testing passes, tester logs completion comments and marks it as `TESTING_COMPLETED`.
- Admins can reassign a tester, requiring a mandatory textual reason.

### Preconditions
- CR is in `TESTING_POOL` status with no tester assigned.
- Tester is authenticated.

### Postconditions
- `tester_id` column set to the tester's ID.
- `testing_started_date` set to current timestamp.

### Validation & Business Rules
- Atomic check: The update query must verify `tester_id IS NULL` and `status = 'TESTING_POOL'` in the `WHERE` clause.
- Only the assigned tester can perform "Testing Passed" or "Raise Bug" actions on that CR.

### Exceptions
- Simultaneous clicks by two testers results in one success and a "CR already assigned" toast message for the other.

---

## 2.4 Bug Lifecycle & Retesting
### Description
Enables testers to raise bugs on assigned CRs, which automatically tags the CR as `BUG_FOUND` (displayed as `OPEN` in developer's active bugs queue). Once fixed, the tester retests the CR.

### User Story
*As a Tester, I want to raise a bug for a failed CR, so that the developer is notified and can fix the issue.*

### Acceptance Criteria
- Bug must include Title, Severity (Low, Medium, High, Critical), Description, Steps to Reproduce, Expected Result, and Actual Result.
- Once raised, CR status moves to `BUG_FOUND` and is routed to the developer's Bug Dashboard.
- When fixed, developer submits transition comments and marks the bug as `RESOLVED`.
- CR is returned back to the original assigning tester for verification.

### Preconditions
- CR is assigned to a tester and in `TESTING_IN_PROGRESS` status.

### Postconditions
- Bug record created in the `bugs` table.
- CR status updated to `BUG_FOUND`.

### Validation & Business Rules
- Jtrack ID must be provided.
- Description, steps to reproduce, expected result, and actual result cannot be blank.

### Exceptions
- Developers cannot self-approve or self-resolve bugs without entering transition comments.

### Success Criteria
- Bug shows up in the "Bugs & Defective CRs" tab for the tester, and in the "Assigned Bugs" list for the developer.
