package com.devtrack.api.services.achievement;

import com.devtrack.api.model.AuditLog;
import com.devtrack.api.model.achievement.RecognitionScore;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.achievement.RecognitionScoreRepository;
import com.devtrack.api.services.AuditLogHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service for Recognition Module Audit Logging & Bias/Equity Guardrails.
 *
 * <p><b>Design principles (spec §4 & §18):</b>
 * <ul>
 *   <li>Immutable audit logs for any manual grant, score adjustment, or level override.</li>
 *   <li>Equity & Bias detector calculates score variance and flags potential privilege skew.</li>
 * </ul>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RecognitionAuditService {

    private final AuditLogRepository auditLogRepo;
    private final RecognitionScoreRepository scoreRepo;

    /**
     * Records an immutable audit log entry for a manual recognition action.
     */
    @Transactional
    public void logManualAction(String actionType, Long targetUserId, String details, String adminUsername) {
        AuditLog audit = new AuditLog();
        audit.setEntityType("RECOGNITION");
        audit.setEntityId(targetUserId);
        audit.setFieldName(actionType);
        audit.setOldValue(null);
        audit.setNewValue(details);
        audit.setRemarks("Admin manual action: " + actionType + " for user " + targetUserId + ". Details: " + details);
        audit.setChangedDate(LocalDateTime.now());

        AuditLogHelper.enrich(audit);
        auditLogRepo.save(audit);

        log.info("RECOGNITION AUDIT LOG: action={} user={} admin={} details={}",
                actionType, targetUserId, adminUsername, details);
    }

    /**
     * Analyzes active score distribution across all users to detect extreme variance,
     * outlier spikes, or potential systemic bias.
     *
     * @return Map containing equity metrics: averageScore, medianScore, giniCoefficient, biasFlagged
     */
    @Transactional(readOnly = true)
    public Map<String, Object> analyzeEquityAndBias() {
        List<RecognitionScore> scores = scoreRepo.findAllActiveOrderByScoreDesc();
        if (scores.isEmpty()) {
            return Map.of(
                "totalUsers", 0,
                "averageScore", 0.0,
                "giniCoefficient", 0.0,
                "biasFlagged", false,
                "message", "No active recognition scores available for analysis."
            );
        }

        int count = scores.size();
        double totalSum = scores.stream().mapToInt(RecognitionScore::getTotalScore).sum();
        double avg = totalSum / count;

        // Calculate Gini Coefficient for inequality measurement
        double absoluteDifferenceSum = 0;
        for (int i = 0; i < count; i++) {
            for (int j = 0; j < count; j++) {
                absoluteDifferenceSum += Math.abs(scores.get(i).getTotalScore() - scores.get(j).getTotalScore());
            }
        }
        double gini = (totalSum > 0) ? (absoluteDifferenceSum / (2 * count * totalSum)) : 0.0;

        // Flag potential bias if Gini coefficient > 0.65 (extreme concentration of points)
        boolean biasFlagged = gini > 0.65;

        log.info("Equity analysis completed: users={} avgScore={} Gini={} biasFlagged={}",
                count, String.format("%.2f", avg), String.format("%.3f", gini), biasFlagged);

        return Map.of(
            "totalUsers", count,
            "averageScore", Math.round(avg * 100.0) / 100.0,
            "giniCoefficient", Math.round(gini * 1000.0) / 1000.0,
            "biasFlagged", biasFlagged,
            "topScore", scores.get(0).getTotalScore(),
            "lowestScore", scores.get(count - 1).getTotalScore()
        );
    }
}
