package com.devtrack.api.notification.model;

import lombok.Getter;

@Getter
public enum NotificationType {
    // ── Authentication ──────────────────────────────────────────────────────────
    WELCOME("Welcome to DevTrack", "SUCCESS", NotificationPriority.NORMAL, true, "cta.login", false),
    TEMPORARY_PASSWORD("Temporary Login Credentials", "WARNING", NotificationPriority.HIGH, true, "cta.login", true),
    PASSWORD_RESET("Password Reset Request", "WARNING", NotificationPriority.HIGH, true, "cta.password.reset", true),
    PASSWORD_CHANGED("Password Successfully Updated", "SUCCESS", NotificationPriority.NORMAL, true, "cta.login", true),
    FORCE_PASSWORD_CHANGE("Action Required: Change Password", "WARNING", NotificationPriority.HIGH, true, "cta.password.change", true),
    ACCOUNT_LOCKED("Security Alert: Account Locked", "FAILURE", NotificationPriority.CRITICAL, true, "cta.support", true),
    ACCOUNT_ACTIVATED("Account Activated", "SUCCESS", NotificationPriority.NORMAL, true, "cta.login", false),

    // ── CR Workflow ─────────────────────────────────────────────────────────────
    CR_CREATED("New CR Logged", "INFORMATION", NotificationPriority.NORMAL, false, "cta.cr.view", false),
    CR_ASSIGNED("New CR Assigned to You", "INFORMATION", NotificationPriority.HIGH, false, "cta.cr.view", false),
    CR_UPDATED("CR Status Updated", "INFORMATION", NotificationPriority.NORMAL, false, "cta.cr.view", false),
    CR_APPROVED("CR Step Approved", "APPROVAL", NotificationPriority.NORMAL, false, "cta.cr.view", false),
    CR_SENT_BACK("CR Returned for Revision", "WARNING", NotificationPriority.HIGH, false, "cta.cr.view", false),
    CR_DELETED("CR Deleted", "WARNING", NotificationPriority.NORMAL, false, "cta.dashboard", false),
    CR_COMPLETED("CR Production Completed", "SUCCESS", NotificationPriority.NORMAL, false, "cta.cr.view", false),

    // ── Bug Workflow ────────────────────────────────────────────────────────────
    BUG_RAISED("New Bug Raised", "FAILURE", NotificationPriority.HIGH, false, "cta.bug.view", false),
    BUG_ASSIGNED("Bug Assigned to You", "WARNING", NotificationPriority.HIGH, false, "cta.bug.view", false),
    BUG_FIXED("Bug Marked as Resolved", "SUCCESS", NotificationPriority.NORMAL, false, "cta.bug.view", false),
    BUG_REOPENED("Bug Reopened by Tester", "FAILURE", NotificationPriority.HIGH, false, "cta.bug.view", false),
    BUG_PASSED("Bug Verified & Closed", "SUCCESS", NotificationPriority.NORMAL, false, "cta.bug.view", false),

    // ── Sprint ──────────────────────────────────────────────────────────────────
    SPRINT_STARTED("Sprint Started", "INFORMATION", NotificationPriority.NORMAL, false, "cta.sprint.view", false),
    SPRINT_COMPLETED("Sprint Retrospective & Summary", "SUCCESS", NotificationPriority.NORMAL, false, "cta.sprint.view", false),

    // ── Deployment ──────────────────────────────────────────────────────────────
    DEPLOYMENT_STARTED("Deployment In Progress", "INFORMATION", NotificationPriority.NORMAL, false, "cta.deployment.view", false),
    DEPLOYMENT_COMPLETED("Deployment Successfully Released", "SUCCESS", NotificationPriority.HIGH, false, "cta.deployment.view", false),
    ROLLBACK_COMPLETED("Deployment Rollback Completed", "CRITICAL", NotificationPriority.CRITICAL, false, "cta.deployment.view", false),

    // ── Reports ─────────────────────────────────────────────────────────────────
    DAILY_SUMMARY("Daily DevTrack Activity Digest", "INFORMATION", NotificationPriority.LOW, false, "cta.reports.view", false),
    WEEKLY_SUMMARY("Weekly Engineering Report", "INFORMATION", NotificationPriority.LOW, false, "cta.reports.view", false),
    NOTIFICATION_DIGEST("Unread Notification Summary", "INFORMATION", NotificationPriority.LOW, false, "cta.dashboard", false);

    private final String title;
    private final String defaultIntent; // SUCCESS, APPROVAL, INFORMATION, WARNING, FAILURE
    private final NotificationPriority defaultPriority;
    private final boolean globalPreference;
    private final String ctaKey;
    private final boolean securityRelated;

    NotificationType(String title, String defaultIntent, NotificationPriority defaultPriority, boolean globalPreference, String ctaKey, boolean securityRelated) {
        this.title = title;
        this.defaultIntent = defaultIntent;
        this.defaultPriority = defaultPriority;
        this.globalPreference = globalPreference;
        this.ctaKey = ctaKey;
        this.securityRelated = securityRelated;
    }
}
