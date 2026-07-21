package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.UserAchievement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    boolean existsByUserIdAndAchievementIdAndActiveFlag(Long userId, Long achievementId, int activeFlag);

    Optional<UserAchievement> findByUserIdAndAchievementId(Long userId, Long achievementId);

    Page<UserAchievement> findByUserIdAndActiveFlag(Long userId, int activeFlag, Pageable pageable);

    Page<UserAchievement> findByUserIdAndActiveFlagOrderByUnlockDateDesc(Long userId, int activeFlag, Pageable pageable);

    List<UserAchievement> findTop5ByUserIdAndActiveFlagOrderByUnlockDateDesc(Long userId, int activeFlag);

    /** Count of active (non-reversed) achievements per user. */
    long countByUserIdAndActiveFlag(Long userId, int activeFlag);

    /**
     * Per-category completion counts for the dashboard categories grid.
     */
    @Query("""
        SELECT a.category.id, COUNT(ua)
        FROM UserAchievement ua
        JOIN ua.achievement a
        WHERE ua.user.id = :userId
          AND ua.activeFlag = 1
        GROUP BY a.category.id
        """)
    List<Object[]> countByUserIdGroupedByCategory(@Param("userId") Long userId);

    /**
     * Rarity breakdown for the dashboard badge-rarity widget.
     */
    @Query("""
        SELECT a.rarity, COUNT(ua)
        FROM UserAchievement ua
        JOIN ua.achievement a
        WHERE ua.user.id = :userId
          AND ua.activeFlag = 1
        GROUP BY a.rarity
        """)
    List<Object[]> countByUserIdGroupedByRarity(@Param("userId") Long userId);

    /** Idempotency guard — check if a source event already granted an achievement. */
    boolean existsBySourceEventId(String sourceEventId);

    /** Achievement count leaderboard */
    @Query(value = """
        SELECT
            u.id AS userId,
            u.full_name AS fullName,
            u.username AS username,
            COUNT(ua.id) AS achievementCount,
            COALESCE(SUM(ua.points_awarded), 0) AS totalAchievementPoints
        FROM user_achievement ua
        JOIN users u ON ua.user_id = u.id
        WHERE ua.active_flag = 1
        GROUP BY u.id, u.full_name, u.username
        ORDER BY achievementCount DESC, totalAchievementPoints DESC
        """, nativeQuery = true)
    List<Map<String, Object>> findAchievementLeaderboard(Pageable pageable);
}
