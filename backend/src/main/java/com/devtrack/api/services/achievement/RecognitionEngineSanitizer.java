package com.devtrack.api.services.achievement;

import com.devtrack.api.model.User;
import com.devtrack.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Task to ensure all user recognition scores and achievements
 * are recalculated and awarded seamlessly without missing past completions.
 * Runs on startup and scheduled daily at 9:00 AM.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RecognitionEngineSanitizer implements CommandLineRunner {

    private final UserRepository userRepo;
    private final RecognitionScoreService scoreService;
    private final AchievementEvaluationService evaluationService;

    @Override
    public void run(String... args) throws Exception {
        executeSanitization();
    }

    /**
     * Scheduled job running once a day at morning 9:00 AM (09:00 AM server time).
     */
    @Scheduled(cron = "0 0 9 * * ?")
    public void executeDailySanitization() {
        log.info("Executing scheduled RecognitionEngineSanitizer daily at 9:00 AM...");
        executeSanitization();
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
