package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.AchievementProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementProgressRepository extends JpaRepository<AchievementProgress, Long> {

    Optional<AchievementProgress> findByUserIdAndAchievementId(Long userId, Long achievementId);

    /** All progress rows for a user, used by My Achievements page. */
    List<AchievementProgress> findByUserIdAndActiveFlagOrderByPercentCompleteDesc(Long userId, int activeFlag);

    /** Top-N closest to unlock — dashboard "nearest-to-unlock" widget. */
    List<AchievementProgress> findTop5ByUserIdAndActiveFlagAndPercentCompleteLessThanOrderByPercentCompleteDesc(
            Long userId, int activeFlag, java.math.BigDecimal lessThan);
}
