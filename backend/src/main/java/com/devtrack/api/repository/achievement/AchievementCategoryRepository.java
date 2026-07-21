package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.AchievementCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AchievementCategoryRepository extends JpaRepository<AchievementCategory, Long> {

    List<AchievementCategory> findByActiveFlagOrderByDisplayOrderAsc(int activeFlag);

    boolean existsByCode(String code);
}
