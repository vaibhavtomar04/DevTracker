package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notifications")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "description", length = 1000)
    private String desc; // Field matches frontend's 'desc', database maps to 'description'

    private String time = "Just now";

    private boolean unread = true;

    @Column(name = "is_pinned")
    private boolean isPinned;

    @Column(name = "snoozed_until")
    private java.time.LocalDateTime snoozedUntil;
}
