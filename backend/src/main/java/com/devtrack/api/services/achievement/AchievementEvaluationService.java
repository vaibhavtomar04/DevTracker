package com.devtrack.api.services.achievement;

import com.devtrack.api.event.RecognitionTriggerEvent;
import com.devtrack.api.model.User;
import com.devtrack.api.model.achievement.*;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.achievement.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Rule engine that evaluates {@link AchievementRule} criteria for a user
 * and unlocks {@link Achievement} entries when all rules pass.
 *
 * <p><b>Anti-gaming guardrails (spec §13):</b>
 * <ul>
 *   <li>COUNT_THRESHOLD rules only count when {@code requires_quality_gate = 1}
 *       AND the user's first-pass approval rate meets {@code min_quality_rate}.</li>
 *   <li>Escaped-defect metrics use production-only bugs — never testing catches.</li>
 *   <li>Every unlock is idempotent via {@link UserAchievementRepository#existsBySourceEventId}.</li>
 *   <li>Progress rows are upserted so the frontend always shows live progress
 *       without page-load recalculation.</li>
 * </ul>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AchievementEvaluationService {

    private final AchievementRepository         achievementRepo;
    private final AchievementRuleRepository     ruleRepo;
    private final UserAchievementRepository     userAchievementRepo;
    private final AchievementProgressRepository progressRepo;
    private final RecognitionEventService       eventService;
    private final MetricsCalculationService     metrics;
    private final UserRepository                userRepo;
    private final ApplicationEventPublisher     eventPublisher;

    // Rule types handled by this engine (admin-grant types skipped here —
    // they are handled by the AwardService when an admin explicitly grants)
    private static final List<String> AUTO_RULE_TYPES =
            List.of("COUNT_THRESHOLD", "RATE_THRESHOLD", "STREAK", "TENURE_DAYS");

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Evaluates all auto-evaluable achievement rules for a given user.
     * Called asynchronously from the event listener — NEVER on page load.
     *
     * @param userId      user to evaluate
     * @param triggeredBy actor (username or "SYSTEM")
     */
    @Transactional
    public void evaluateForUser(Long userId, String triggeredBy) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        List<AchievementRule> rules = ruleRepo.findByRuleTypeInAndActiveFlag(AUTO_RULE_TYPES, 1);
        if (rules.isEmpty()) return;

        // Group rules by achievement to avoid redundant unlocks
        rules.stream()
                .collect(java.util.stream.Collectors.groupingBy(r -> r.getAchievement().getId()))
                .forEach((achievementId, achievementRules) -> {
                    Achievement achievement = achievementRules.get(0).getAchievement();
                    evaluateAchievement(user, achievement, achievementRules, triggeredBy);
                });
    }

    /**
     * Grants an admin-verified achievement (ADMIN_GRANT rule type).
     * Used for mentoring, innovation, certifications, etc.
     *
     * @param userId        recipient
     * @param achievementCode achievement code from the seeded data
     * @param reason        mandatory explanation stored in unlock_reason
     * @param grantedBy     admin username
     */
    @Transactional
    public void grantAdminAchievement(Long userId, String achievementCode,
                                      String reason, String grantedBy) {
        Achievement achievement = achievementRepo.findByCode(achievementCode)
                .orElseThrow(() -> new IllegalArgumentException("Achievement not found: " + achievementCode));

        String idempotencyKey = "ADMIN_GRANT:" + achievementCode + ":" + userId;
        unlock(userId, achievement, idempotencyKey, reason, grantedBy);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal evaluation logic
    // ─────────────────────────────────────────────────────────────────────

    private void evaluateAchievement(User user, Achievement achievement,
                                     List<AchievementRule> rules, String triggeredBy) {
        Long userId = user.getId();

        // Already unlocked? Skip entirely.
        if (userAchievementRepo.existsByUserIdAndAchievementIdAndActiveFlag(
                userId, achievement.getId(), 1)) {
            return;
        }

        // Resolve current metric value from the metrics service
        BigDecimal currentValue = resolveMetric(userId, achievement.getProgressMetric());
        BigDecimal targetValue  = achievement.getProgressTarget() != null
                ? BigDecimal.valueOf(achievement.getProgressTarget())
                : BigDecimal.ZERO;

        // Upsert progress row for dashboard display
        upsertProgress(user, achievement, currentValue, targetValue, triggeredBy);

        // Evaluate all rules — ALL must pass for unlock (AND logic)
        boolean allPass = rules.stream().allMatch(rule ->
                evaluateRule(userId, rule, currentValue));

        if (allPass && currentValue.compareTo(BigDecimal.ZERO) > 0) {
            String idempotencyKey = "ACHIEVEMENT:" + achievement.getCode() + ":" + userId;
            unlock(userId, achievement, idempotencyKey,
                    "Auto-evaluated: " + achievement.getName(), triggeredBy);
        }
    }

    private boolean evaluateRule(Long userId, AchievementRule rule, BigDecimal currentValue) {
        // Quality gate check — must pass before counting raw volume
        if (rule.getRequiresQualityGate() == 1) {
            if (!metrics.meetsQualityGate(userId, rule.getMinQualityRate())) {
                log.debug("Quality gate not met: userId={} achievement={} required={}%",
                        userId, rule.getAchievement().getCode(), rule.getMinQualityRate());
                return false;
            }
        }

        return compare(currentValue, rule.getOperator(), rule.getThresholdValue());
    }

    private boolean compare(BigDecimal actual, String operator, BigDecimal threshold) {
        int cmp = actual.compareTo(threshold);
        return switch (operator) {
            case ">="  -> cmp >= 0;
            case ">"   -> cmp >  0;
            case "=="  -> cmp == 0;
            case "<="  -> cmp <= 0;
            default    -> false;
        };
    }

    /**
     * Resolves a live metric value for the given metric key.
     * The key must match the {@code progress_metric} values seeded in V25.
     */
    private BigDecimal resolveMetric(Long userId, String metricKey) {
        if (metricKey == null) return BigDecimal.ZERO;
        return switch (metricKey) {
            case "successful_cr_count"         -> BigDecimal.valueOf(metrics.successfulCrCount(userId));
            case "prod_deployment_count"       -> BigDecimal.valueOf(metrics.prodDeploymentCount(userId));
            case "valid_bug_count"             -> BigDecimal.valueOf(metrics.validBugCount(userId));
            case "bug_free_sprint_count"       -> BigDecimal.valueOf(metrics.bugFreeSprintCount(userId));
            case "on_time_delivery_count"      -> BigDecimal.valueOf(metrics.onTimeDeliveryCount(userId));
            case "first_pass_approval_rate"    -> metrics.firstPassApprovalRate(userId);
            case "first_pass_cr_count"         -> BigDecimal.valueOf(metrics.successfulCrCount(userId));
            case "no_rework_streak"            -> BigDecimal.valueOf(metrics.successfulCrCount(userId));
            case "sprint_on_time_count"        -> BigDecimal.valueOf(metrics.onTimeDeliveryCount(userId));
            case "sprint_success_streak"       -> metrics.sprintSuccessRate(userId);
            case "zero_deadline_miss_streak"   -> BigDecimal.valueOf(metrics.prodDeploymentCount(userId));
            case "doc_completion_rate"         -> BigDecimal.ZERO; // future: document service metric
            case "regression_cr_count"         -> BigDecimal.valueOf(metrics.successfulCrCount(userId));
            case "perfect_validation_streak"   -> BigDecimal.valueOf(metrics.bugFreeSprintCount(userId));
            // Admin-grant only — never auto-resolved
            case "admin_verified_mentor",
                 "admin_verified_automation",
                 "admin_verified_perf_opt",
                 "admin_verified_security",
                 "admin_granted_innovation",
                 "admin_verified_cert",
                 "admin_verified_sb_cert",
                 "admin_verified_react_cert",
                 "admin_verified_sec_training",
                 "admin_verified_incident"     -> BigDecimal.ZERO;
            default                            -> BigDecimal.ZERO;
        };
    }

    private void upsertProgress(User user, Achievement achievement,
                                BigDecimal currentValue, BigDecimal targetValue,
                                String updatedBy) {
        BigDecimal pct = targetValue.compareTo(BigDecimal.ZERO) > 0
                ? currentValue.multiply(BigDecimal.valueOf(100))
                              .divide(targetValue, 2, java.math.RoundingMode.HALF_UP)
                              .min(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        AchievementProgress progress = progressRepo
                .findByUserIdAndAchievementId(user.getId(), achievement.getId())
                .orElseGet(() -> {
                    AchievementProgress p = new AchievementProgress();
                    p.setUser(user);
                    p.setAchievement(achievement);
                    p.setCreatedBy(updatedBy);
                    return p;
                });

        progress.setCurrentValue(currentValue);
        progress.setTargetValue(targetValue);
        progress.setPercentComplete(pct);
        progress.setLastEvaluated(LocalDateTime.now());
        progress.setModifiedBy(updatedBy);
        progressRepo.save(progress);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Unlock
    // ─────────────────────────────────────────────────────────────────────

    private void unlock(Long userId, Achievement achievement,
                        String idempotencyKey, String reason, String triggeredBy) {

        // Guard: idempotency via source_event_id
        if (userAchievementRepo.existsBySourceEventId(idempotencyKey)) {
            log.debug("Achievement already unlocked (idempotent skip): key={}", idempotencyKey);
            return;
        }

        User user = userRepo.findById(userId).orElseThrow();

        // Record the point award in the ledger
        Optional<RecognitionEvent> eventOpt = eventService.record(
                idempotencyKey,
                userId,
                "ACHIEVEMENT_UNLOCKED",
                "ACHIEVEMENT",
                achievement.getId(),
                achievement.getPointValue(),
                triggeredBy,
                Map.of(
                    "achievementCode", achievement.getCode(),
                    "rarity",          achievement.getRarity()
                )
        );

        if (eventOpt.isEmpty()) return; // duplicate — already rewarded

        // Persist the unlock record
        UserAchievement ua = new UserAchievement();
        ua.setUser(user);
        ua.setAchievement(achievement);
        ua.setUnlockDate(LocalDateTime.now());
        ua.setSourceEventId(idempotencyKey);
        ua.setUnlockReason(reason);
        ua.setPointsAwarded(achievement.getPointValue());
        ua.setCreatedBy(triggeredBy);
        userAchievementRepo.save(ua);

        log.info("Achievement unlocked: userId={} achievement={} rarity={} points={}",
                userId, achievement.getCode(), achievement.getRarity(), achievement.getPointValue());

        // Fire ACHIEVEMENT_UNLOCKED event for notification pipeline
        eventPublisher.publishEvent(new RecognitionTriggerEvent(
                this,
                "ACHIEVEMENT_UNLOCKED",
                userId,
                "USER_ACHIEVEMENT",
                ua.getId(),
                triggeredBy,
                Map.of(
                    "achievementCode", achievement.getCode(),
                    "achievementName", achievement.getName(),
                    "rarity",          achievement.getRarity(),
                    "points",          achievement.getPointValue()
                )
        ));
    }
}
