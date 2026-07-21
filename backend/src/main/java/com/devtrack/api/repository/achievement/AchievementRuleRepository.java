package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.AchievementRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AchievementRuleRepository extends JpaRepository<AchievementRule, Long> {

    List<AchievementRule> findByAchievementIdAndActiveFlag(Long achievementId, int activeFlag);

    List<AchievementRule> findByRuleTypeAndActiveFlag(String ruleType, int activeFlag);

    /** All active rules of auto-evaluable types (COUNT_THRESHOLD, RATE_THRESHOLD, STREAK, TENURE_DAYS). */
    List<AchievementRule> findByRuleTypeInAndActiveFlag(List<String> ruleTypes, int activeFlag);
}
