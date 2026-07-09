package com.devtrack.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages WebSocket sessions for real-time notification delivery.
 *
 * Session lifecycle:
 *  - Frontend connects to /ws/notifications?userId=123
 *  - Handler stores the session keyed by userId
 *  - Any backend service can call sendToUser(userId, payload) to push a message
 *  - On close / error, session is cleaned up automatically
 *
 * Thread safety: ConcurrentHashMap + CopyOnWriteArrayList handle concurrent access.
 */
@Component
@Slf4j
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    /** userId → list of active WebSocket sessions (user may have multiple tabs). */
    private final Map<Long, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Connection lifecycle ─────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = extractUserId(session);
        if (userId == null) {
            log.warn("WebSocket connection rejected — no userId in query: {}", session.getUri());
            try { session.close(CloseStatus.BAD_DATA); } catch (IOException ignored) {}
            return;
        }
        userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(session);
        log.info("WS connected: userId={} sessionId={} total-sessions={}", userId, session.getId(),
                userSessions.get(userId).size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = extractUserId(session);
        if (userId != null) {
            List<WebSocketSession> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) userSessions.remove(userId);
            }
        }
        log.info("WS closed: sessionId={} status={}", session.getId(), status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WS transport error: sessionId={} error={}", session.getId(), exception.getMessage());
        afterConnectionClosed(session, CloseStatus.SERVER_ERROR);
    }

    // ── Message sending ──────────────────────────────────────────────

    /**
     * Push a notification payload to all active sessions for a user.
     * The payload is serialized to JSON automatically.
     * Silently skips closed sessions and removes them.
     */
    public void sendToUser(Long userId, Object payload) {
        List<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("WS: No active sessions for userId={}, notification will be fetched on next poll", userId);
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(payload);
            TextMessage message = new TextMessage(json);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                    } catch (IOException e) {
                        log.warn("WS send failed: sessionId={} userId={} error={}", session.getId(), userId, e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("WS serialization error for userId={}: {}", userId, e.getMessage());
        }
    }

    /** Broadcast a message to all connected users (e.g., system announcements). */
    public void broadcast(Object payload) {
        userSessions.keySet().forEach(userId -> sendToUser(userId, payload));
    }

    /** Returns count of currently connected unique users (useful for health endpoints). */
    public int connectedUserCount() {
        return userSessions.size();
    }

    // ── Utility ──────────────────────────────────────────────────────

    private Long extractUserId(WebSocketSession session) {
        try {
            String query = session.getUri() != null ? session.getUri().getQuery() : null;
            if (query == null) return null;
            for (String param : query.split("&")) {
                String[] parts = param.split("=");
                if (parts.length == 2 && "userId".equals(parts[0])) {
                    return Long.parseLong(parts[1]);
                }
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid userId in WS query: {}", session.getUri());
        }
        return null;
    }
}
