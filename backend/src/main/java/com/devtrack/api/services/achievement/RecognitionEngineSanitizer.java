package com.devtrack.api.services.achievement;

import com.devtrack.api.model.AppConfig;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.ConfigRepository;
import com.devtrack.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Task to ensure all user recognition scores and achievements
 * are recalculated and awarded seamlessly without missing past completions.
 * Reads its schedule dynamically from the `app_configs` database table (key: `recognition.sanitizer.cron`).
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RecognitionEngineSanitizer implements CommandLineRunner, SchedulingConfigurer {

    private final UserRepository userRepo;
    private final RecognitionScoreService scoreService;
    private final AchievementEvaluationService evaluationService;
    private final ConfigRepository configRepository;

    public static final String CRON_CONFIG_KEY = "recognition.sanitizer.cron";
    public static final String DEFAULT_CRON = "0 0 9 * * ?";

    @Override
    public void run(String... args) throws Exception {
        executeSanitization();
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.addTriggerTask(
            this::executeDailySanitization,
            triggerContext -> {
                String cron = getCronFromDatabase();
                log.debug("Evaluating RecognitionEngineSanitizer dynamic DB cron: {}", cron);
                CronTrigger trigger = new CronTrigger(cron);
                return trigger.nextExecution(triggerContext);
            }
        );
    }

    public void executeDailySanitization() {
        log.info("Executing scheduled RecognitionEngineSanitizer via DB dynamic cron...");
        executeSanitization();
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

    private void executeSanitization() {
        log.info("Starting RecognitionEngineSanitizer to recalculate user scores & evaluate achievements...");
        try {
            List<User> users = userRepo.findAll();
            for (User u : users) {
                try {
                    scoreService.applyDeltaAndRecalculate(u.getId(), "SYSTEM");
                    evaluationService.evaluateForUser(u.getId(), "SYSTEM");
                } catch (Exception ex) {
                    log.warn("Failed to evaluate recognition for user ID {}: {}", u.getId(), ex.getMessage());
                }
            }
            log.info("RecognitionEngineSanitizer completed successfully for {} users.", users.size());
        } catch (Exception e) {
            log.error("RecognitionEngineSanitizer failed: ", e);
        }
    }
}
