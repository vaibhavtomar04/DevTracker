package com.devtrack.api.event;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phase 2 (P2 / typed real-time events) — payload for a typed domain event that
 * is pushed over the SAME existing /ws/notifications socket, additively to the
 * legacy {"type":"NOTIFICATION", ...} frame.
 *
 * Wire shape (JSON):
 *   { "type":"ENTITY_EVENT", "entity":"TASK", "action":"UPDATED",
 *     "id":42, "actorId":7, "ts":1690000000000 }
 *
 * The frontend Event Router (Phase 3, gated by ENABLE_EVENT_ROUTER) will consume
 * these to patch its store surgically instead of firing a full fetchData(true)
 * refresh — which is what removes the runaway idle REST traffic (P2).
 *
 * DORMANT BY DEFAULT: this class is only emitted by {@link DomainEventPublisher},
 * which is a no-op unless devtrack.typed-events.enabled=true. Nothing in the app
 * references it yet, so landing it changes no runtime behavior.
 */
@Data
@NoArgsConstructor
public class DomainEventPayload {

    /** Discriminator the client switches on; always "ENTITY_EVENT" for typed events. */
    private String type = "ENTITY_EVENT";

    /** Coarse entity bucket the client routes on: TASK, BUG, AUDIT, CR, NOTIFICATION. */
    private String entity;

    /** Change verb, client-tolerant: CREATED, UPDATED, DELETED, STATUS_CHANGED, ... */
    private String action;

    /** Primary key of the changed entity, when applicable. */
    private Long id;

    /** User who caused the change, when known (client may skip self-originated events). */
    private Long actorId;

    /** Epoch millis when the event was produced. */
    private long ts;

    /**
     * Convenience factory: sets type=ENTITY_EVENT and ts=now.
     */
    public static DomainEventPayload of(String entity, String action, Long id, Long actorId) {
        DomainEventPayload p = new DomainEventPayload();
        p.setEntity(entity);
        p.setAction(action);
        p.setId(id);
        p.setActorId(actorId);
        p.setTs(System.currentTimeMillis());
        return p;
    }
}
