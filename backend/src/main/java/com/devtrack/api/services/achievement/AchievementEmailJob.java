package com.devtrack.api.services.achievement;

import com.devtrack.api.model.achievement.AchievementNotification;
import com.devtrack.api.repository.achievement.AchievementNotificationRepository;
import com.devtrack.api.services.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Background worker job that drains unsent achievement notification emails.
 *
 * <p>Spec §18: Email notifications are processed asynchronously by a scheduled
 * job to ensure user workflows and HTTP threads are never blocked.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AchievementEmailJob {

    private final AchievementNotificationRepository notifRepo;
    private final EmailNotificationService          emailService;

    @org.springframework.beans.factory.annotation.Value("${devtrack.achievement.email.enabled:true}")
    private boolean achievementEmailEnabled;

    /**
     * Runs every 60 seconds to process unsent achievement notification emails.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void processUnsentAchievementEmails() {
        if (!achievementEmailEnabled) {
            return;
        }
        List<AchievementNotification> pending = notifRepo.findByIsEmailSentAndActiveFlag(0, 1);
        if (pending.isEmpty()) {
            return;
        }

        log.debug("Processing {} unsent achievement notification emails...", pending.size());

        for (AchievementNotification notif : pending) {
            try {
                if (notif.getUser() != null && notif.getUser().getEmail() != null) {
                    // Dispatch role-aware achievement email notification
                    emailService.sendAchievementNotificationEmail(
                        notif.getUser(),
                        notif.getTitle(),
                        notif.getMessage()
                    );
                    log.info("Achievement email sent: user={} title={}",
                            notif.getUser().getUsername(), notif.getTitle());
                }

                notif.setIsEmailSent(1);
                notif.setModifiedDate(LocalDateTime.now());
                notifRepo.save(notif);

            } catch (Exception ex) {
                log.error("Failed to send achievement notification email for notifId={}: {}",
                        notif.getId(), ex.getMessage());
            }
        }
    }
}
