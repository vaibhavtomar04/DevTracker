package com.devtrack.api.notification.service;

import com.devtrack.api.model.AppConfig;
import com.devtrack.api.repository.ConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

/**
 * Service for weekly report email digests.
 * Reads its execution schedule dynamically from the `app_configs` table (`report.digest.cron`),
 * allowing administrators to adjust schedule at runtime without application restarts.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ReportDigestService implements SchedulingConfigurer {

    private final ConfigRepository configRepository;

    @Value("${ENABLE_REPORT_DIGEST:false}")
    private boolean enableReportDigest;

    public static final String CRON_CONFIG_KEY = "report.digest.cron";
    public static final String DEFAULT_CRON = "0 0 9 * * MON";

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.addTriggerTask(
            this::executeWeeklyReportDigest,
            triggerContext -> {
                String cron = getCronFromDatabase();
                log.debug("Evaluating ReportDigestService dynamic DB cron: {}", cron);
                CronTrigger trigger = new CronTrigger(cron);
                return trigger.nextExecution(triggerContext);
            }
        );
    }

    public void executeWeeklyReportDigest() {
        if (!enableReportDigest) {
            log.info("Weekly report email digest is disabled (ENABLE_REPORT_DIGEST=false). Skipping execution.");
            return;
        }

        log.info("Generating and dispatching weekly executive report email digest...");
        // Execution hook for compiling weekly analytics summary and sending HTML digest email
    }

    private String getCronFromDatabase() {
        try {
            return configRepository.findByConfigKey(CRON_CONFIG_KEY)
                    .map(AppConfig::getConfigValue)
                    .filter(val -> val != null && !val.trim().isEmpty())
                    .orElse(DEFAULT_CRON);
        } catch (Exception e) {
            log.warn("Could not read cron from database key {}, defaulting to {}: {}", CRON_CONFIG_KEY, DEFAULT_CRON, e.getMessage());
            return DEFAULT_CRON;
        }
    }

    public boolean isReportDigestEnabled() {
        return enableReportDigest;
    }
}
