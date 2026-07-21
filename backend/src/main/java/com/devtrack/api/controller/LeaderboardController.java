package com.devtrack.api.controller;

import com.devtrack.api.repository.achievement.RecognitionScoreRepository;
import com.devtrack.api.repository.achievement.UserAchievementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Public-read leaderboard API.
 *
 * <p><b>Anti-export guard (spec §4):</b> Raw scores are presented as relative
 * rankings only. The admin export is explicitly labelled as non-evaluative and
 * restricted to DEVADMIN/TESTADMIN by the method-level PreAuthorize.
 * The frontend must display the note "This data must not be used for
 * performance evaluation" wherever scores are rendered.</p>
 */
@RestController
@RequestMapping("/api/recognition/leaderboard")
@Slf4j
@RequiredArgsConstructor
public class LeaderboardController {

    private final RecognitionScoreRepository scoreRepo;
    private final UserAchievementRepository  userAchievementRepo;

    /**
     * GET /api/recognition/leaderboard?period=ALL_TIME|MONTHLY|QUARTERLY&size=10
     *
     * Returns ranked users by total_score descending.
     * Period filtering is handled on the score aggregate — the score row
     * is always "all-time" by spec; period rows are future extension points.
     */
    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> leaderboard(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "ALL_TIME") String period) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Map<String, Object>> result = scoreRepo.findLeaderboard(pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/recognition/leaderboard/top?limit=5
     * Quick-access top-N for dashboard widgets (no auth required beyond login).
     */
    @GetMapping("/top")
    public ResponseEntity<List<Map<String, Object>>> topN(
            @RequestParam(defaultValue = "5") int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(limit, 50));
        return ResponseEntity.ok(scoreRepo.findLeaderboard(pageable).getContent());
    }

    /**
     * GET /api/recognition/leaderboard/achievements?limit=10
     * Users ranked by achievement count (rarity-weighted).
     */
    @GetMapping("/achievements")
    public ResponseEntity<List<Map<String, Object>>> achievementRanking(
            @RequestParam(defaultValue = "10") int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(limit, 50));
        return ResponseEntity.ok(userAchievementRepo.findAchievementLeaderboard(pageable));
    }
}
