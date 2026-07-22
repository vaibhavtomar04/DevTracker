package com.devtrack.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Configures the WebSocket endpoint for real-time notifications.
 * Frontend connects to /ws/notifications?userId={userId} to receive
 * push notifications for CR updates, bug assignments, and approvals.
 */
@Configuration
@EnableWebSocket
@Slf4j
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationWebSocketHandler notificationWebSocketHandler;

    public WebSocketConfig(NotificationWebSocketHandler notificationWebSocketHandler) {
        this.notificationWebSocketHandler = notificationWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry
            .addHandler(notificationWebSocketHandler, "/ws/notifications")
            .addInterceptors(new HandshakeInterceptor() {
                @Override
                public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                               WebSocketHandler wsHandler, Map<String, Object> attributes) {
                    String upgrade = request.getHeaders().getFirst("Upgrade");
                    if (upgrade == null || !"websocket".equalsIgnoreCase(upgrade)) {
                        log.debug("Rejecting non-WebSocket HTTP request to /ws/notifications (missing or invalid Upgrade header)");
                        return false;
                    }
                    return true;
                }

                @Override
                public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                           WebSocketHandler wsHandler, Exception exception) {
                }
            })
            .setAllowedOriginPatterns("*");
    }
}
