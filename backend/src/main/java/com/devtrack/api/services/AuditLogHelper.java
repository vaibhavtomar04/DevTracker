package com.devtrack.api.services;

import com.devtrack.api.model.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class AuditLogHelper {

    public static String getClientIp() {
        ServletRequestAttributes attribs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attribs != null) {
            HttpServletRequest request = attribs.getRequest();
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isEmpty()) {
                return xff.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
        return "unknown";
    }

    public static String getClientBrowser() {
        ServletRequestAttributes attribs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attribs != null) {
            HttpServletRequest request = attribs.getRequest();
            String ua = request.getHeader("User-Agent");
            if (ua != null) {
                // Return a truncated version if it is too long
                return ua.length() > 255 ? ua.substring(0, 252) + "..." : ua;
            }
            return "unknown";
        }
        return "unknown";
    }

    public static void enrich(AuditLog log) {
        if (log != null) {
            log.setIpAddress(getClientIp());
            log.setBrowser(getClientBrowser());
        }
    }
}
