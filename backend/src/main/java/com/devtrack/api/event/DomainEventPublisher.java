package com.devtrack.api.event;

import com.devtrack.api.config.NotificationWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Phase 2 (P2 / typed real-time events) — the single emitter for typed domain events
 * (strangler-fig seam).
 *
 * Reuses the SAME {@link NotificationWebSocketHandler} / single socket as legacy
 * notifications, so it opens ZERO new connections (respects the P2 "1 WS" budget).
 *
 * Typed events emit UNCONDITIONALLY — the previous devtrack.typed-events.enabled
 * feature flag has been removed at the developer's request (patches are being applied
 * and tested side by side).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DomainEventPublisher {

    private final NotificationWebSocketHandler webSocketHandler;

    /** Push a typed event to a single user's active sessions. */
    public void publish(Long userId, DomainEventPayload payload) {
        if (userId == null || payload == null) {
            return;
        }
        try {
            webSocketHandler.sendToUser(userId, payload);
        } catch (Exception e) {
            log.warn("Typed-event publish failed for userId={} entity={} action={}: {}",
                    userId, payload.getEntity(), payload.getAction(), e.getMessage());
        }
    }

    /** Push the same event to several users (e.g. all co-owners of a CR). */
    public void publish(List<Long> userIds, DomainEventPayload payload) {
        if (userIds == null || payload == null) {
            return;
        }
        for (Long uid : userIds) {
            publish(uid, payload);
        }
    }
}
