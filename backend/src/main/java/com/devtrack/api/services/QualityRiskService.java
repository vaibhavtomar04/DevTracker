package com.devtrack.api.services;

import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QualityRiskService {

    private final TaskRepository taskRepository;
    private final BugRepository bugRepository;
    private final BugReviewRepository bugReviewRepository;
    private final QualityRiskHistoryRepository qualityRiskHistoryRepository;
    private final ConfigRepository configRepository;
    private final UserRepository userRepository;
    private final com.devtrack.api.config.NotificationWebSocketHandler webSocketHandler;
    private final NotificationRepository notificationRepository;

    private static final String KEY_BUGS = "quality_risk.threshold.bugs";
    private static final String KEY_RETESTS = "quality_risk.threshold.retests";
    private static final String KEY_REJECTED = "quality_risk.threshold.rejected_bugs";
    private static final String KEY_CHALLENGE = "quality_risk.threshold.challenge_rate";

    // Default Fallbacks
    private static final int DEFAULT_BUGS = 3;
    private static final int DEFAULT_RETESTS = 2;
    private static final int DEFAULT_REJECTED = 2;
    private static final double DEFAULT_CHALLENGE = 0.30; // 30%

    /**
     * Evaluates quality risk for a specific CR.
     */
    @Transactional
    public void evaluateCrRisk(Long crId, String triggeredByEvent) {
        Task cr = taskRepository.findById(crId).orElse(null);
        if (cr == null) return;

        // 1. Gather Metrics
        long bugCount = bugRepository.countByBugTaskId(crId);
        int retestCount = cr.getTotalRetests() != null ? cr.getTotalRetests() : 0;
        long rejectedCount = bugReviewRepository.countByCrIdAndReviewStatus(crId, "REJECTED");

        long totalReviews = bugReviewRepository.countByCrId(crId);
        long challengedReviews = bugReviewRepository.countByCrIdAndReviewStatus(crId, "CHALLENGED");
        double challengeRate = totalReviews > 0 ? (double) challengedReviews / totalReviews : 0.0;

        // 2. Fetch Configurable Thresholds
        int thresholdBugs = getConfigInt(KEY_BUGS, DEFAULT_BUGS);
        int thresholdRetests = getConfigInt(KEY_RETESTS, DEFAULT_RETESTS);
        int thresholdRejected = getConfigInt(KEY_REJECTED, DEFAULT_REJECTED);
        double thresholdChallenge = getConfigDouble(KEY_CHALLENGE, DEFAULT_CHALLENGE);

        // 3. Determine At-Risk Status
        boolean exceedsBugs = bugCount >= thresholdBugs;
        boolean exceedsRetests = retestCount >= thresholdRetests;
        boolean exceedsRejected = rejectedCount >= thresholdRejected;
        boolean exceedsChallenge = challengeRate >= thresholdChallenge;

        boolean isAtRisk = exceedsBugs || exceedsRetests || exceedsRejected || exceedsChallenge;

        boolean oldIsRisk = cr.isQualityRisk();
        cr.setQualityRisk(isAtRisk);
        taskRepository.save(cr);

        // 4. Save Risk History Snapshot
        Map<String, Object> thresholdSnapshotMap = new HashMap<>();
        thresholdSnapshotMap.put("bugs", thresholdBugs);
        thresholdSnapshotMap.put("retests", thresholdRetests);
        thresholdSnapshotMap.put("rejected_bugs", thresholdRejected);
        thresholdSnapshotMap.put("challenge_rate", thresholdChallenge);

        String snapshotJson = "";
        try {
            snapshotJson = new ObjectMapper().writeValueAsString(thresholdSnapshotMap);
        } catch (Exception e) {
            log.error("Failed to serialize threshold snapshot", e);
        }

        QualityRiskHistory history = new QualityRiskHistory();
        history.setCrId(crId);
        history.setBugCount((int) bugCount);
        history.setRetestCount(retestCount);
        history.setRejectedBugCount((int) rejectedCount);
        history.setChallengeRate(challengeRate);
        history.setRiskScore((double) (bugCount + retestCount + rejectedCount));
        history.setThresholdSnapshot(snapshotJson);
        history.setIsAtRisk(isAtRisk ? 1 : 0);
        history.setEvaluatedAt(LocalDateTime.now());
        history.setCreatedBy("QualityRiskEngine");
        history.setModifiedBy("QualityRiskEngine");
        qualityRiskHistoryRepository.save(history);

        // 5. Fire Notification once per state change (no spam)
        if (isAtRisk && !oldIsRisk) {
            notifyParties(cr, triggeredByEvent, bugCount, retestCount, rejectedCount, challengeRate);
        }
    }

    private void notifyParties(Task cr, String event, long bugs, int retests, long rejected, double challengeRate) {
        String title = "CR Quality Risk Alert: " + cr.getJtrackId();
        String desc = String.format(
            "CR '%s' has been flagged as a Quality Risk due to event: %s. Current metrics: %d bugs, %d retests, %d rejected, %.0f%% challenge rate.",
            cr.getTitle(), event, bugs, retests, rejected, challengeRate * 100
        );

        Set<Long> notifiedUserIds = new HashSet<>();

        // Notify Developer(s)
        if (cr.getAssignedDeveloper() != null) {
            notifiedUserIds.add(cr.getAssignedDeveloper().getId());
        }
        cr.getDevelopers().forEach(d -> {
            if (d.getDeveloper() != null) notifiedUserIds.add(d.getDeveloper().getId());
        });

        // Notify Tester
        if (cr.getTester() != null) {
            notifiedUserIds.add(cr.getTester().getId());
        }

        // Notify Admins
        userRepository.findAll().stream()
            .filter(u -> u.getRoles().contains(Role.DEVADMIN) || u.getRoles().contains(Role.TESTADMIN))
            .forEach(admin -> notifiedUserIds.add(admin.getId()));

        // Push Notifications
        for (Long uid : notifiedUserIds) {
            createAndPushNotification(uid, title, desc);
        }
    }

    private void createAndPushNotification(Long userId, String title, String desc) {
        try {
            Notification notif = new Notification();
            notif.setUserId(userId);
            notif.setTitle(title);
            notif.setDesc(desc);
            notif.setTime("Just now");
            notif.setUnread(true);

            Notification saved = notificationRepository.save(notif);
            webSocketHandler.sendToUser(userId, Map.of(
                "type", "NOTIFICATION",
                "notification", saved
            ));
        } catch (Exception e) {
            log.error("Failed to send quality risk notification to user {}", userId, e);
        }
    }

    private int getConfigInt(String key, int defaultValue) {
        return configRepository.findByConfigKey(key)
            .map(c -> {
                try {
                    return Integer.parseInt(c.getConfigValue());
                } catch (Exception e) {
                    return defaultValue;
                }
            })
            .orElse(defaultValue);
    }

    private double getConfigDouble(String key, double defaultValue) {
        return configRepository.findByConfigKey(key)
            .map(c -> {
                try {
                    return Double.parseDouble(c.getConfigValue());
                } catch (Exception e) {
                    return defaultValue;
                }
            })
            .orElse(defaultValue);
    }

    /**
     * Hourly background sweep to evaluate all active CRs.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void sweepAllCrs() {
        log.info("Starting background Quality Risk Engine evaluation sweep...");
        List<Task> activeTasks = taskRepository.findAll();
        for (Task t : activeTasks) {
            evaluateCrRisk(t.getId(), "SCHEDULED_SWEEP");
        }
        log.info("Quality Risk sweep completed for {} CRs.", activeTasks.size());
    }
}
