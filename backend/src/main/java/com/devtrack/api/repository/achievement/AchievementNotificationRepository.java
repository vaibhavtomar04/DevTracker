package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.AchievementNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AchievementNotificationRepository extends JpaRepository<AchievementNotification, Long> {

    Page<AchievementNotification> findByUserIdAndActiveFlag(
            Long userId, int activeFlag, Pageable pageable);

    Page<AchievementNotification> findByUserIdAndActiveFlagOrderByCreatedDateDesc(
            Long userId, int activeFlag, Pageable pageable);

    long countByUserIdAndIsReadAndActiveFlag(Long userId, int isRead, int activeFlag);

    /** Email-send queue — all unsent, active notifications. */
    List<AchievementNotification> findByIsEmailSentAndActiveFlag(int isEmailSent, int activeFlag);

    @Modifying
    @Query("UPDATE AchievementNotification n SET n.isRead = 1 WHERE n.user.id = :userId AND n.activeFlag = 1")
    void markAllReadForUser(@Param("userId") Long userId);
}
