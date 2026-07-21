package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.AwardHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AwardHistoryRepository extends JpaRepository<AwardHistory, Long> {

    Page<AwardHistory> findByRecipientIdAndActiveFlagOrderByAwardDateDesc(
            Long recipientId, int activeFlag, Pageable pageable);

    /** Published monthly awards for a given period — used by the Awards page. */
    List<AwardHistory> findByAwardAwardTypeAndPeriodYearAndPeriodMonthAndIsPublishedAndActiveFlag(
            String awardType, short year, byte month, int isPublished, int activeFlag);

    /** Unpublished monthly drafts awaiting admin approval. */
    List<AwardHistory> findByAwardAwardTypeAndIsPublishedAndActiveFlag(
            String awardType, int isPublished, int activeFlag);

    /** Idempotency — prevent double-award for the same period/recipient/award. */
    Optional<AwardHistory> findByAwardIdAndRecipientIdAndPeriodYearAndPeriodMonth(
            Long awardId, Long recipientId, short year, byte month);

    /** Admin analytics — all awards, newest first. */
    Page<AwardHistory> findByActiveFlagOrderByAwardDateDesc(int activeFlag, Pageable pageable);

    /** Source event idempotency guard. */
    boolean existsBySourceEventId(String sourceEventId);

    /** Award history for a specific award type, with pagination. */
    @Query("""
        SELECT ah FROM AwardHistory ah
        WHERE ah.award.awardType = :awardType
          AND ah.isPublished = 1
          AND ah.activeFlag = 1
        ORDER BY ah.awardDate DESC
        """)
    Page<AwardHistory> findPublishedByAwardType(@Param("awardType") String awardType, Pageable pageable);
}
