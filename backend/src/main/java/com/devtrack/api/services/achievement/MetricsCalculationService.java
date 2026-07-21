package com.devtrack.api.services.achievement;

import com.devtrack.api.repository.TaskRepository;
import com.devtrack.api.repository.achievement.RecognitionEventRepository;
import com.devtrack.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Calculates quality-gated metrics for a given user from raw DB data.
 *
 * <p>Spec §12 mandate: <em>rates and ratios gate volume</em>.
 * Every metric exposed here is a <b>rate or ratio</b> — never a raw count
 * on its own. The score engine adds raw-count bonuses only <em>after</em>
 * a quality rate threshold is satisfied.</p>
 *
 * <p>Spec §13 anti-gaming: escaped-defect penalties apply to
 * <b>production-escaped bugs only</b>, never to bugs caught in testing.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MetricsCalculationService {

    private static final int SCALE = 2;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final TaskRepository taskRepo;
    private final RecognitionEventRepository eventRepo;
    private final UserRepository userRepo;

    // ── Public metrics API ────────────────────────────────────────────────

    /**
     * Successful CR count for a user (CR reached PROD_COMPLETED or CLOSED
     * with no rollback recorded). Used for COUNT_THRESHOLD rules.
     */
    @Transactional(readOnly = true)
    public int successfulCrCount(Long userId) {
        return taskRepo.countSuccessfulCrsForUser(userId);
    }

    /**
     * First-pass approval rate: % of CRs that were approved on first review
     * without a CHANGES_REQUESTED status in their history.
     * Returns 0-100.
     */
    @Transactional(readOnly = true)
    public BigDecimal firstPassApprovalRate(Long userId) {
        int total    = taskRepo.countCrsAssignedToUser(userId);
        int approved = taskRepo.countFirstPassApprovedCrsForUser(userId);
        return rate(approved, total);
    }

    /**
     * Deployment success rate: % of prod deployments with no rollback.
     * Returns 0-100.
     */
    @Transactional(readOnly = true)
    public BigDecimal deploymentSuccessRate(Long userId) {
        int total     = taskRepo.countProdDeploymentsForUser(userId);
        int successes = taskRepo.countSuccessfulProdDeploymentsForUser(userId);
        return rate(successes, total);
    }

    /**
     * Sprint success rate: % of sprints where the user completed all assigned
     * items on time.
     * Returns 0-100.
     */
    @Transactional(readOnly = true)
    public BigDecimal sprintSuccessRate(Long userId) {
        int total    = taskRepo.countSprintsForUser(userId);
        int onTime   = taskRepo.countOnTimeSprintsForUser(userId);
        return rate(onTime, total);
    }

    /**
     * Escaped-defect rate: % of CRs that had at least one bug traced back to
     * a <b>production</b> escape (source = PROD, not SIT/UAT).
     * Spec §13: penalties only for production escapes.
     * Returns 0-100.
     */
    @Transactional(readOnly = true)
    public BigDecimal escapedDefectRate(Long userId) {
        int total   = taskRepo.countCrsAssignedToUser(userId);
        int escaped = taskRepo.countProdEscapedDefectCrsForUser(userId);
        return rate(escaped, total);
    }

    /**
     * Reopen rate: % of bugs associated with a user's CRs that were reopened
     * at least once.
     * Returns 0-100.
     */
    @Transactional(readOnly = true)
    public BigDecimal reopenRate(Long userId) {
        int total    = taskRepo.countBugsForUserCrs(userId);
        int reopened = taskRepo.countReopenedBugsForUserCrs(userId);
        return rate(reopened, total);
    }

    /**
     * Composite quality score (0-100) used by the Recognition Score.
     * Weights (admin-configurable in future; hardcoded as spec defaults here):
     *   40% first-pass approval rate
     *   30% deployment success rate
     *   20% sprint success rate
     *   10% inverse escaped-defect rate  (lower escaped = higher score)
     */
    @Transactional(readOnly = true)
    public BigDecimal compositeQualityScore(Long userId) {
        BigDecimal fpar  = firstPassApprovalRate(userId);   // 0-100
        BigDecimal dsr   = deploymentSuccessRate(userId);
        BigDecimal ssr   = sprintSuccessRate(userId);
        BigDecimal edrPenalty = HUNDRED.subtract(escapedDefectRate(userId)); // invert

        BigDecimal score = fpar.multiply(BigDecimal.valueOf(0.40))
                .add(dsr.multiply(BigDecimal.valueOf(0.30)))
                .add(ssr.multiply(BigDecimal.valueOf(0.20)))
                .add(edrPenalty.multiply(BigDecimal.valueOf(0.10)));

        return score.setScale(SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Raw count of valid (non-rejected) bugs raised by a tester.
     * Used for BUG_HUNTER achievement.
     */
    @Transactional(readOnly = true)
    public int validBugCount(Long userId) {
        return taskRepo.countValidBugsRaisedByUser(userId);
    }

    /**
     * Consecutive bug-free sprints count: sprints where no bugs were raised
     * against the user's CRs.
     */
    @Transactional(readOnly = true)
    public int bugFreeSprintCount(Long userId) {
        return taskRepo.countBugFreeSprintsForUser(userId);
    }

    /**
     * On-time delivery count: total SIT/UAT deliveries that met their
     * expected date.
     */
    @Transactional(readOnly = true)
    public int onTimeDeliveryCount(Long userId) {
        return taskRepo.countOnTimeDeliveriesForUser(userId);
    }

    /**
     * Prod deployment count (all, including rollbacks — used for milestones).
     */
    @Transactional(readOnly = true)
    public int prodDeploymentCount(Long userId) {
        return taskRepo.countProdDeploymentsForUser(userId);
    }

    /**
     * Checks whether the user meets the quality gate (first-pass approval ≥ threshold).
     * Called by the rule engine before any COUNT_THRESHOLD reward is granted.
     */
    public boolean meetsQualityGate(Long userId, BigDecimal minQualityRate) {
        if (minQualityRate == null) return true;
        BigDecimal actual = firstPassApprovalRate(userId);
        return actual.compareTo(minQualityRate) >= 0;
    }

    // ── Helper ────────────────────────────────────────────────────────────

    /** Safe percentage: returns 0 when denominator is 0. */
    private BigDecimal rate(int numerator, int denominator) {
        if (denominator == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(numerator)
                .multiply(HUNDRED)
                .divide(BigDecimal.valueOf(denominator), SCALE, RoundingMode.HALF_UP);
    }
}
