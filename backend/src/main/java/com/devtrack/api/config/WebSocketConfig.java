package com.devtrack.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Configures the WebSocket endpoint for real-time notifications.
 * Frontend connects to /ws/notifications?userId={userId} to receive
 * push notifications for CR updates, bug assignments, and approvals.
 *
 * STOMP is intentionally NOT used here to keep the stack simple and
 * match the existing plain-WS patterns. If STOMP is needed later,
 * replace this with @EnableWebSocketMessageBroker.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationWebSocketHandler notificationWebSocketHandler;

    public WebSocketConfig(NotificationWebSocketHandler notificationWebSocketHandler) {
        this.notificationWebSocketHandler = notificationWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry
            .addHandler(notificationWebSocketHandler, "/ws/notifications")
            .setAllowedOriginPatterns("*"); // Tightened in production via environment config
    }
}
