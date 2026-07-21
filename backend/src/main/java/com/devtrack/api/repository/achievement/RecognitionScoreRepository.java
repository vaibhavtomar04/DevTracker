package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.RecognitionScore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Map;
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

    /** Main leaderboard query for ranked users */
    @Query(value = """
        SELECT
            rs.id AS scoreId,
            u.id AS userId,
            u.full_name AS fullName,
            u.username AS username,
            rs.total_score AS totalScore,
            rs.quality_score AS qualityScore,
            rs.approval_rate AS approvalRate,
            rs.deployment_success_rate AS deploymentSuccessRate,
            rs.sprint_success_rate AS sprintSuccessRate,
            rl.title AS levelTitle,
            rl.level_number AS levelNumber,
            rl.icon_name AS levelIcon
        FROM recognition_score rs
        JOIN users u ON rs.user_id = u.id
        LEFT JOIN recognition_level rl ON rs.current_level_id = rl.id
        WHERE rs.active_flag = 1
        ORDER BY rs.total_score DESC
        """,
        countQuery = "SELECT count(*) FROM recognition_score WHERE active_flag = 1",
        nativeQuery = true)
    Page<Map<String, Object>> findLeaderboard(Pageable pageable);
}
