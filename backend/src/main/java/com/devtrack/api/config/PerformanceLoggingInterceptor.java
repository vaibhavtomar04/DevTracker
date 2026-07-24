package com.devtrack.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * PerformanceLoggingInterceptor — observability for slow API endpoints.
 *
 * - Logs WARN for any API call > 300ms (surfaced in application logs).
 * - Logs DEBUG for all other calls (only visible when debug logging enabled).
 * - Registered via WebMvcConfigurer in PersistanceDevtrackConfiguration.
 */
@Component
public class PerformanceLoggingInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger("DEVTRACK.PERF");
    private static final long SLOW_THRESHOLD_MS = 300L;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("_perfStartTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Object startAttr = request.getAttribute("_perfStartTime");
        if (startAttr == null) return;

        long elapsed = System.currentTimeMillis() - (Long) startAttr;
        String method = request.getMethod();
        String uri = request.getRequestURI();
        int status = response.getStatus();

        if (elapsed > SLOW_THRESHOLD_MS) {
            log.warn("SLOW API [{} {}] {}ms status={}", method, uri, elapsed, status);
        } else {
            log.debug("API [{} {}] {}ms status={}", method, uri, elapsed, status);
        }
    }
}
