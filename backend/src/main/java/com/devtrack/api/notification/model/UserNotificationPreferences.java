package com.devtrack.api.notification.model;

import com.devtrack.api.model.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_notification_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "sprint_notifications", nullable = false)
    private boolean sprintNotifications = true;

    @Column(name = "bug_notifications", nullable = false)
    private boolean bugNotifications = true;

    @Column(name = "deployment_notifications", nullable = false)
    private boolean deploymentNotifications = true;

    @Column(name = "summary_notifications", nullable = false)
    private boolean summaryNotifications = true;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
