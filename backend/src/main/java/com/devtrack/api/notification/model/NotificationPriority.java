package com.devtrack.api.notification.model;

import lombok.Getter;

@Getter
public enum NotificationPriority {
    CRITICAL("CRITICAL", true),
    HIGH("HIGH", true),
    NORMAL("NORMAL", false),
    LOW("LOW", false);

    private final String label;
    private final boolean showInSubject;

    NotificationPriority(String label, boolean showInSubject) {
        this.label = label;
        this.showInSubject = showInSubject;
    }
}
