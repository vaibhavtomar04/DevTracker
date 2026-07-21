package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.Achievement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, Long> {

    Optional<Achievement> findByCode(String code);

    List<Achievement> findByCategoryIdAndActiveFlagOrderByDisplayOrderAsc(Long categoryId, int activeFlag);

    Page<Achievement> findByActiveFlagOrderByCategoryAscDisplayOrderAsc(int activeFlag, Pageable pageable);

    Page<Achievement> findByActiveFlag(int activeFlag, Pageable pageable);

    Page<Achievement> findByCategoryCodeAndActiveFlag(String categoryCode, int activeFlag, Pageable pageable);

    Page<Achievement> findByRarityAndActiveFlag(String rarity, int activeFlag, Pageable pageable);

    Page<Achievement> findByCategoryCodeAndRarityAndActiveFlag(String categoryCode, String rarity, int activeFlag, Pageable pageable);

    List<Achievement> findByIsMilestoneAndActiveFlag(int isMilestone, int activeFlag);

    /**
     * Achievements NOT yet unlocked by this user — used for "nearest-to-unlock" dashboard widget.
     */
    @Query("""
        SELECT a FROM Achievement a
        WHERE a.activeFlag = 1
          AND NOT EXISTS (
              SELECT ua FROM UserAchievement ua
              WHERE ua.achievement = a
                AND ua.user.id = :userId
                AND ua.activeFlag = 1
          )
        ORDER BY a.category.displayOrder ASC, a.displayOrder ASC
        """)
    List<Achievement> findLockedAchievementsForUser(@Param("userId") Long userId, Pageable pageable);
}
