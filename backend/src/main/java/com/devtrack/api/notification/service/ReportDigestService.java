package com.devtrack.api.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class ReportDigestService {

    private static final Logger log = LoggerFactory.getLogger(ReportDigestService.class);

    @Value("${ENABLE_REPORT_DIGEST:false}")
    private boolean enableReportDigest;

    /**
     * Weekly Email Digest Hook — Triggers every Monday at 9:00 AM.
     * Feature-flagged via ENABLE_REPORT_DIGEST (default: false).
     */
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendWeeklyReportDigest() {
        if (!enableReportDigest) {
            log.info("Weekly report email digest is disabled (ENABLE_REPORT_DIGEST=false). Skipping execution.");
            return;
        }

        log.info("Generating and dispatching weekly executive report email digest...");
        // Execution hook for compiling weekly analytics summary and sending HTML digest email
    }

    public boolean isReportDigestEnabled() {
        return enableReportDigest;
    }
}
