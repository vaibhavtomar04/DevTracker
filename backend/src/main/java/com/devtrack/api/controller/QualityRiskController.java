package com.devtrack.api.controller;

import com.devtrack.api.dto.QualityRiskDetailsDto;
import com.devtrack.api.model.AppConfig;
import com.devtrack.api.model.Task;
import com.devtrack.api.repository.*;
import com.devtrack.api.services.QualityRiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QualityRiskController {

    private final TaskRepository taskRepository;
    private final BugRepository bugRepository;
    private final BugReviewRepository bugReviewRepository;
    private final ConfigRepository configRepository;

    private static final String KEY_BUGS = "quality_risk.threshold.bugs";
    private static final String KEY_RETESTS = "quality_risk.threshold.retests";
    private static final String KEY_REJECTED = "quality_risk.threshold.rejected_bugs";
    private static final String KEY_CHALLENGE = "quality_risk.threshold.challenge_rate";

    private static final int DEFAULT_BUGS = 3;
    private static final int DEFAULT_RETESTS = 2;
    private static final int DEFAULT_REJECTED = 2;
    private static final double DEFAULT_CHALLENGE = 0.30;

    @GetMapping("/crs/{id}/quality-risk")
    public ResponseEntity<?> getCrQualityRisk(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(task -> {
                    long bugCount = bugRepository.countByBugTaskId(id);
                    int retestCount = task.getTotalRetests() != null ? task.getTotalRetests() : 0;
                    long rejectedCount = bugReviewRepository.countByCrIdAndReviewStatus(id, "REJECTED");

                    long totalReviews = bugReviewRepository.countByCrId(id);
                    long challengedReviews = bugReviewRepository.countByCrIdAndReviewStatus(id, "CHALLENGED");
                    double challengeRate = totalReviews > 0 ? (double) challengedReviews / totalReviews : 0.0;

                    int thresholdBugs = getConfigInt(KEY_BUGS, DEFAULT_BUGS);
                    int thresholdRetests = getConfigInt(KEY_RETESTS, DEFAULT_RETESTS);
                    int thresholdRejected = getConfigInt(KEY_REJECTED, DEFAULT_REJECTED);
                    double thresholdChallenge = getConfigDouble(KEY_CHALLENGE, DEFAULT_CHALLENGE);

                    QualityRiskDetailsDto dto = QualityRiskDetailsDto.builder()
                            .crId(id)
                            .crNumber(task.getJtrackId())
                            .crTitle(task.getTitle())
                            .isQualityRisk(task.isQualityRisk())
                            .bugCount(bugCount)
                            .thresholdBugs(thresholdBugs)
                            .bugThresholdExceeded(bugCount >= thresholdBugs)
                            .retestCount(retestCount)
                            .thresholdRetests(thresholdRetests)
                            .retestThresholdExceeded(retestCount >= thresholdRetests)
                            .rejectedBugCount(rejectedCount)
                            .thresholdRejectedBugs(thresholdRejected)
                            .rejectedBugsThresholdExceeded(rejectedCount >= thresholdRejected)
                            .challengeRate(challengeRate)
                            .thresholdChallengeRate(thresholdChallenge)
                            .challengeRateThresholdExceeded(challengeRate >= thresholdChallenge)
                            .build();

                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/quality-risk/at-risk")
    public ResponseEntity<?> getAtRiskCrs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<Task> atRiskTasks = taskRepository.findAtRiskCrs(pageable);
        return ResponseEntity.ok(atRiskTasks);
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
}
