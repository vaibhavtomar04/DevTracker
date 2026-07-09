package com.devtrack.api.controller;

import com.devtrack.api.config.NotificationWebSocketHandler;
import com.devtrack.api.model.Notification;
import com.devtrack.api.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Extended Notification controller:
 *  - GET  /api/notifications                          — all notifications (admin use)
 *  - GET  /api/notifications/for-user/{userId}        — user-scoped notifications
 *  - POST /api/notifications                          — create + push via WebSocket
 *  - PUT  /api/notifications/read/{id}               — mark single read
 *  - PUT  /api/notifications/read-all/{userId}       — mark all read
 *  - DELETE /api/notifications/clear/{userId}        — delete all for user
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketHandler webSocketHandler;

    public NotificationController(NotificationRepository notificationRepository,
                                   NotificationWebSocketHandler webSocketHandler) {
        this.notificationRepository = notificationRepository;
        this.webSocketHandler = webSocketHandler;
    }

    @GetMapping
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    /** User-scoped notifications — active and sorted. */
    @GetMapping("/for-user/{userId}")
    public List<Notification> getForUser(@PathVariable Long userId) {
        return notificationRepository.findActiveNotifications(userId, java.time.LocalDateTime.now());
    }

    @PutMapping("/pin/{id}")
    public ResponseEntity<?> togglePin(@PathVariable Long id) {
        return notificationRepository.findById(id)
                .map(notif -> {
                    notif.setPinned(!notif.isPinned());
                    Notification saved = notificationRepository.save(notif);
                    return ResponseEntity.ok().body(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/snooze/{id}")
    public ResponseEntity<?> snoozeNotification(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return notificationRepository.findById(id)
                .map(notif -> {
                    String snoozeUntilStr = body.get("snoozedUntil");
                    if (snoozeUntilStr != null) {
                        try {
                            notif.setSnoozedUntil(java.time.LocalDateTime.parse(snoozeUntilStr));
                        } catch (Exception e) {
                            notif.setSnoozedUntil(java.time.LocalDateTime.now().plusHours(1));
                        }
                    } else {
                        notif.setSnoozedUntil(java.time.LocalDateTime.now().plusHours(1));
                    }
                    Notification saved = notificationRepository.save(notif);
                    return ResponseEntity.ok().body(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Creates a notification and immediately pushes it via WebSocket
     * to the target user's active browser sessions.
     */
    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Notification notification) {
        Notification saved = notificationRepository.save(notification);
        // Real-time push — safe even if user has no open WS session
        webSocketHandler.sendToUser(saved.getUserId(), Map.of(
                "type", "NOTIFICATION",
                "notification", saved
        ));
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PutMapping("/read/{id}")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return notificationRepository.findById(id)
                .map(notif -> {
                    notif.setUnread(false);
                    notificationRepository.save(notif);
                    return ResponseEntity.ok().body("{\"message\": \"Notification marked read\"}");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Mark all notifications for a user as read in one call. */
    @PutMapping("/read-all/{userId}")
    @Transactional
    public ResponseEntity<?> markAllRead(@PathVariable Long userId) {
        List<Notification> unread = notificationRepository.findByUserId(userId)
                .stream()
                .filter(Notification::isUnread)
                .toList();
        unread.forEach(n -> n.setUnread(false));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok().body("{\"message\": \"All notifications marked read\", \"count\": " + unread.size() + "}");
    }

    @DeleteMapping("/clear/{userId}")
    @Transactional
    public ResponseEntity<?> clearNotifications(@PathVariable Long userId) {
        notificationRepository.deleteByUserId(userId);
        return ResponseEntity.ok().body("{\"message\": \"Notifications cleared\"}");
    }
}
