package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.RecognitionEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RecognitionEventRepository extends JpaRepository<RecognitionEvent, Long> {

    /** Idempotency check — used before every insert to prevent double-reward. */
    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<RecognitionEvent> findByIdempotencyKey(String idempotencyKey);

    /** Timeline: all events for a user, newest first. */
    Page<RecognitionEvent> findByUserIdAndIsReversedOrderByEventDateDesc(
            Long userId, int isReversed, Pageable pageable);

    /** Score delta sum for a user in a date window (for monthly score calculation). */
    @Query("""
        SELECT COALESCE(SUM(e.pointsDelta), 0)
        FROM RecognitionEvent e
        WHERE e.user.id = :userId
          AND e.isReversed = 0
          AND e.eventDate BETWEEN :from AND :to
        """)
    int sumPointsDeltaForUserInWindow(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** All-time points total for a user (excluding reversed events). */
    @Query("""
        SELECT COALESCE(SUM(e.pointsDelta), 0)
        FROM RecognitionEvent e
        WHERE e.user.id = :userId
          AND e.isReversed = 0
        """)
    int sumAllTimePointsForUser(@Param("userId") Long userId);
}
