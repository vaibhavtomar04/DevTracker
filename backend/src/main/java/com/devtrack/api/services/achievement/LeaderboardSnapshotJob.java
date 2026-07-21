package com.devtrack.api.services.achievement;

import com.devtrack.api.model.achievement.LeaderboardSnapshot;
import com.devtrack.api.model.achievement.RecognitionScore;
import com.devtrack.api.repository.achievement.LeaderboardSnapshotRepository;
import com.devtrack.api.repository.achievement.RecognitionScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that captures daily leaderboard snapshots into the
 * {@link LeaderboardSnapshot} table for historical trend analytics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class LeaderboardSnapshotJob {

    private final RecognitionScoreRepository    scoreRepo;
    private final LeaderboardSnapshotRepository snapshotRepo;

    /**
     * Runs daily at midnight (00:00:00) to capture ranked score snapshots.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void captureDailyLeaderboardSnapshot() {
        log.info("Starting scheduled daily leaderboard snapshot job...");

        List<RecognitionScore> scores = scoreRepo.findAllActiveOrderByScoreDesc();
        if (scores.isEmpty()) {
            log.info("No active recognition scores found. Skipping snapshot.");
            return;
        }

        LocalDate today = LocalDate.now();
        int rank = 1;

        for (RecognitionScore s : scores) {
            LeaderboardSnapshot snapshot = new LeaderboardSnapshot();
            snapshot.setSnapshotDate(today);
            snapshot.setPeriodType("DAILY");
            snapshot.setUser(s.getUser());
            snapshot.setRankPosition(rank);
            snapshot.setTotalScore(s.getTotalScore());
            snapshot.setQualityScore(s.getQualityScore());
            snapshot.setLevelNumber(s.getCurrentLevel() != null ? s.getCurrentLevel().getLevelNumber() : 1);
            snapshot.setCreatedBy("SYSTEM");
            snapshot.setCreatedDate(LocalDateTime.now());

            snapshotRepo.save(snapshot);
            rank++;
        }

        log.info("Daily leaderboard snapshot complete: captured {} user ranks for date={}",
                scores.size(), today);
    }
}
