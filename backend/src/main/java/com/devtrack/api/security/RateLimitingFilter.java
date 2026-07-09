package com.devtrack.api.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitingFilter implements Filter {

    private static class TokenBucket {
        private final long capacity;
        private final long refillTimeMs;
        private double tokens;
        private long lastRefillTimestamp;

        public TokenBucket(long capacity, long refillTimeMs) {
            this.capacity = capacity;
            this.refillTimeMs = refillTimeMs;
            this.tokens = capacity;
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        public synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long elapsedTime = now - lastRefillTimestamp;
            if (elapsedTime > 0) {
                double tokensToAdd = (double) elapsedTime / refillTimeMs;
                tokens = Math.min(capacity, tokens + tokensToAdd);
                lastRefillTimestamp = now;
            }
        }
    }

    // IP -> Bucket Map for Auth endpoints (login, forgot password, reset password)
    private final Map<String, TokenBucket> authBuckets = new ConcurrentHashMap<>();

    // IP -> Bucket Map for general endpoints
    private final Map<String, TokenBucket> generalBuckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        // Rate limiting disabled per developer environment requirements
        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void destroy() {}
}
