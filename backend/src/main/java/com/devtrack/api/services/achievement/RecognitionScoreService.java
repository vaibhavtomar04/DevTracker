package com.devtrack.api.services.achievement;

import com.devtrack.api.model.User;
import com.devtrack.api.model.achievement.RecognitionLevel;
import com.devtrack.api.model.achievement.RecognitionScore;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.achievement.RecognitionEventRepository;
import com.devtrack.api.repository.achievement.RecognitionLevelRepository;
import com.devtrack.api.repository.achievement.RecognitionScoreRepository;
import com.devtrack.api.event.RecognitionTriggerEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Manages the {@link RecognitionScore} row for each user.
 *
 * Design contract:
 * - Score is NEVER recalculated on page load — only called from async event
 *   listeners or @Scheduled jobs (spec §18).
 * - Total score = sum of all non-reversed RecognitionEvent point deltas
 *   (materialised view of the immutable event ledger).
 * - Quality rates are always recalculated from live DB aggregates — rates gate
 *   volume so rapid CR creation cannot inflate scores (spec §12).
 * - Level evaluation is bundled into every score update; LEVEL_UP events fire
 *   as new ApplicationEvents when a threshold is crossed.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RecognitionScoreService {

    private final RecognitionScoreRepository scoreRepo;
    private final RecognitionLevelRepository levelRepo;
    private final RecognitionEventRepository eventRepo;
    private final MetricsCalculationService  metrics;
    private final UserRepository             userRepo;
    private final ApplicationEventPublisher  eventPublisher;

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Materialises score from ledger, recalculates quality rates, evaluates
     * level changes, and publishes LEVEL_UP if threshold crossed.
     *
     * @param userId      user to update
     * @param triggeredBy actor (username or "SYSTEM") for audit columns
     */
    @Transactional
    public void applyDeltaAndRecalculate(Long userId, String triggeredBy) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // 1. Materialise total from ledger (no raw-count gaming possible)
        int newTotal = Math.max(eventRepo.sumAllTimePointsForUser(userId), 0);

        // 2. Recalculate quality rates — rate gates volume (spec §12)
        BigDecimal qualityScore   = metrics.compositeQualityScore(userId);
        BigDecimal approvalRate   = metrics.firstPassApprovalRate(userId);
        BigDecimal deploymentRate = metrics.deploymentSuccessRate(userId);
        BigDecimal sprintRate     = metrics.sprintSuccessRate(userId);
        BigDecimal escapedRate    = metrics.escapedDefectRate(userId);
        BigDecimal reopenRate     = metrics.reopenRate(userId);

        // 3. Determine new level
        RecognitionLevel newLevel = levelRepo.findCurrentLevelForScore(newTotal).orElse(null);

        // 4. Upsert score row
        RecognitionScore score = scoreRepo.findByUserId(userId).orElseGet(() -> {
            RecognitionScore s = new RecognitionScore();
            s.setUser(user);
            s.setCreatedBy(triggeredBy);
            return s;
        });

        RecognitionLevel previousLevel = score.getCurrentLevel();

        score.setTotalScore(newTotal);
        score.setCurrentLevel(newLevel);
        score.setQualityScore(qualityScore);
        score.setApprovalRate(approvalRate);
        score.setDeploymentSuccessRate(deploymentRate);
        score.setSprintSuccessRate(sprintRate);
        score.setEscapedDefectRate(escapedRate);
        score.setReopenRate(reopenRate);
        score.setLastRecalculated(LocalDateTime.now());
        score.setModifiedBy(triggeredBy);
        scoreRepo.save(score);

        log.info("Score updated: userId={} total={} quality={} level={}",
                userId, newTotal,
                qualityScore.setScale(1, RoundingMode.HALF_UP),
                newLevel != null ? newLevel.getTitle() : "none");

        // 5. Fire LEVEL_UP if the user crossed a level threshold
        if (levelChanged(previousLevel, newLevel)) {
            log.info("LEVEL_UP: userId={} [{}] -> [{}]",
                    userId,
                    previousLevel != null ? previousLevel.getTitle() : "none",
                    newLevel != null ? newLevel.getTitle() : "none");

            eventPublisher.publishEvent(new RecognitionTriggerEvent(
                    this,
                    "LEVEL_UP",
                    userId,
                    "RECOGNITION_SCORE",
                    score.getId(),
                    triggeredBy,
                    Map.of(
                        "newLevel",    newLevel != null ? newLevel.getTitle()       : "",
                        "newLevelNum", newLevel != null ? newLevel.getLevelNumber() : 0,
                        "prevLevel",   previousLevel != null ? previousLevel.getTitle() : "",
                        "totalScore",  newTotal
                    )
            ));
        }
    }

    /** Returns the current score snapshot for a user, if it exists. */
    @Transactional(readOnly = true)
    public Optional<RecognitionScore> getScore(Long userId) {
        return scoreRepo.findByUserId(userId);
    }

    // ─────────────────────────────────────────────────────────────────────

    private boolean levelChanged(RecognitionLevel previous, RecognitionLevel next) {
        if (previous == null && next == null) return false;
        if (previous == null || next == null) return true;
        return !previous.getId().equals(next.getId());
    }
}
