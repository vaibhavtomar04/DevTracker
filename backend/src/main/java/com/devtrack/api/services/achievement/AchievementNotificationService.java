package com.devtrack.api.services.achievement;

import com.devtrack.api.model.User;
import com.devtrack.api.model.achievement.AchievementNotification;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.achievement.AchievementNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Creates in-app notification records for every achievement/level-up event.
 * Also queues email notifications (sent lazily by a @Scheduled job to avoid
 * blocking the async pipeline).
 *
 * <p>Called by {@link com.devtrack.api.event.RecognitionEventListener} for
 * LEVEL_UP and ACHIEVEMENT_UNLOCKED events only. Never called on page load.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AchievementNotificationService {

    private final AchievementNotificationRepository notifRepo;
    private final UserRepository                    userRepo;

    /**
     * Persists an in-app notification and queues email delivery.
     *
     * @param userId          recipient
     * @param notificationType ACHIEVEMENT_UNLOCKED | LEVEL_UP
     * @param referenceId     PK of user_achievement or recognition_score row
     * @param referenceType   USER_ACHIEVEMENT | RECOGNITION_SCORE
     * @param metadata        context blob (achievement name, level, points, etc.)
     * @param createdBy       triggering actor
     */
    @Transactional
    public void sendUnlockNotification(
            Long userId,
            String notificationType,
            Long referenceId,
            String referenceType,
            Map<String, Object> metadata,
            String createdBy) {

        User user = userRepo.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot send achievement notification — user not found: {}", userId);
            return;
        }

        String title   = buildTitle(notificationType, metadata);
        String message = buildMessage(notificationType, metadata);
        int    points  = resolvePoints(metadata);

        boolean suppressEmail = Boolean.TRUE.equals(metadata.get("suppressEmail"))
                || "true".equalsIgnoreCase(String.valueOf(metadata.get("suppressEmail")));

        AchievementNotification notif = new AchievementNotification();
        notif.setUser(user);
        notif.setNotificationType(notificationType);
        notif.setReferenceId(referenceId);
        notif.setReferenceType(referenceType);
        notif.setTitle(title);
        notif.setMessage(message);
        notif.setPointsDelta(points);
        notif.setIsRead(0);
        notif.setSuppressEmail(suppressEmail ? 1 : 0);
        notif.setIsEmailSent(suppressEmail ? 1 : 0);   // Mark as sent/suppressed if suppressed by admin option
        notif.setCreatedBy(createdBy);
        notifRepo.save(notif);

        log.info("Achievement notification created: userId={} type={} title={}",
                userId, notificationType, title);
    }

    /**
     * Marks all unread achievement notifications as read for a user.
     */
    @Transactional
    public void markAllRead(Long userId) {
        notifRepo.markAllReadForUser(userId);
    }

    /** Unread count — called by the bell badge in the frontend. */
    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notifRepo.countByUserIdAndIsReadAndActiveFlag(userId, 0, 1);
    }

    // ─────────────────────────────────────────────────────────────────────

    private String buildTitle(String type, Map<String, Object> meta) {
        return switch (type) {
            case "ACHIEVEMENT_UNLOCKED" -> "Achievement Unlocked: " + meta.getOrDefault("achievementName", "");
            case "LEVEL_UP"             -> "Level Up! You reached " + meta.getOrDefault("newLevel", "a new level");
            case "BADGE_EARNED"         -> "Badge Earned!";
            case "MILESTONE_REACHED"    -> "Milestone Reached!";
            case "AWARD_GRANTED"        -> "Award Granted!";
            case "CHALLENGE_COMPLETED"  -> "Challenge Completed!";
            default                     -> "Recognition Update";
        };
    }

    private String buildMessage(String type, Map<String, Object> meta) {
        return switch (type) {
            case "ACHIEVEMENT_UNLOCKED" -> String.format(
                    "You've unlocked the '%s' achievement (%s rarity) and earned %s points!",
                    meta.getOrDefault("achievementName", ""),
                    meta.getOrDefault("rarity", ""),
                    meta.getOrDefault("points", 0));
            case "LEVEL_UP" -> {
                String prev = meta.get("prevLevel") != null ? meta.get("prevLevel").toString().trim() : "";
                String next = meta.getOrDefault("newLevel", "").toString().trim();
                Object score = meta.getOrDefault("totalScore", 0);
                if (!prev.isEmpty()) {
                    yield String.format("Congratulations! You've advanced from %s to %s with a total score of %s.", prev, next, score);
                } else {
                    yield String.format("Congratulations! You've reached the level of %s with a total score of %s.", next, score);
                }
            }
            default -> "Keep up the great work!";
        };
    }

    private int resolvePoints(Map<String, Object> meta) {
        Object p = meta.get("points");
        if (p instanceof Number n) return n.intValue();
        p = meta.get("pointValue");
        if (p instanceof Number n) return n.intValue();
        return 0;
    }
}
