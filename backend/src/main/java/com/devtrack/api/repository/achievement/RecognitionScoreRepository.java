package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.RecognitionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RecognitionScoreRepository extends JpaRepository<RecognitionScore, Long> {

    Optional<RecognitionScore> findByUserId(Long userId);

    /** Used by the bias/equity audit job — all active scores ordered by total desc. */
    @Query("""
        SELECT rs FROM RecognitionScore rs
        WHERE rs.activeFlag = 1
        ORDER BY rs.totalScore DESC
        """)
    java.util.List<RecognitionScore> findAllActiveOrderByScoreDesc();

    /**
     * Count users with score visibility allowing public leaderboard inclusion.
     */
    long countByScoreVisibilityAndActiveFlag(String scoreVisibility, int activeFlag);

    /** Percentile context for the admin analytics view. */
    @Query(value = """
        SELECT ROUND(
            (SUM(CASE WHEN total_score < :score THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
        )
        FROM recognition_score
        WHERE active_flag = 1
        """, nativeQuery = true)
    Double computePercentileForScore(@Param("score") int score);
}
