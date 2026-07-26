package com.devtrack.api.event;

import com.devtrack.api.config.NotificationWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Phase 2 (P2 / typed real-time events) — the single emitter for typed domain
 * events (strangler-fig seam).
 *
 * Design constraints honored:
 *  - Reuses the SAME {@link NotificationWebSocketHandler} / single socket as legacy
 *    notifications, so it opens ZERO new connections (respects the P2 "1 WS" budget).
 *  - Gated by devtrack.typed-events.enabled (DEFAULT FALSE). When disabled every
 *    publish(...) is a no-op, so this bean is completely inert until explicitly
 *    switched on AND a producer starts calling it.
 *  - No existing flow references this class yet; landing it changes no behavior.
 *
 * Rollback: set devtrack.typed-events.enabled=false (or remove producers). The
 * frontend continues to work off the legacy {type:"NOTIFICATION"} frame + poll.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DomainEventPublisher {

    private final NotificationWebSocketHandler webSocketHandler;

    @Value("${devtrack.typed-events.enabled:false}")
    private boolean typedEventsEnabled;

    /** Push a typed event to a single user's active sessions. No-op when disabled. */
    public void publish(Long userId, DomainEventPayload payload) {
        if (!typedEventsEnabled || userId == null || payload == null) {
            return;
        }
        try {
            webSocketHandler.sendToUser(userId, payload);
        } catch (Exception e) {
            log.warn("Typed-event publish failed for userId={} entity={} action={}: {}",
                    userId, payload.getEntity(), payload.getAction(), e.getMessage());
        }
    }

    /** Push the same event to several users (e.g. all co-owners of a CR). No-op when disabled. */
    public void publish(List<Long> userIds, DomainEventPayload payload) {
        if (!typedEventsEnabled || userIds == null || payload == null) {
            return;
        }
        for (Long uid : userIds) {
            publish(uid, payload);
        }
    }

    /**
     * Whether typed events are currently active. Producers can branch on this to
     * skip building a payload when the feature is off (cheap short-circuit).
     */
    public boolean isEnabled() {
        return typedEventsEnabled;
    }
}
