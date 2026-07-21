package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.RecognitionLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecognitionLevelRepository extends JpaRepository<RecognitionLevel, Long> {

    List<RecognitionLevel> findByActiveFlagOrderByLevelNumberAsc(int activeFlag);

    /**
     * Returns the highest level whose min_points threshold the given score has crossed.
     * Used by the background level-evaluation job.
     */
    @Query("""
        SELECT l FROM RecognitionLevel l
        WHERE l.activeFlag = 1
          AND l.minPoints <= :score
        ORDER BY l.minPoints DESC
        LIMIT 1
        """)
    Optional<RecognitionLevel> findCurrentLevelForScore(@Param("score") int score);

    /**
     * Returns the next level above the current one (for progress-ring calculation).
     */
    @Query("""
        SELECT l FROM RecognitionLevel l
        WHERE l.activeFlag = 1
          AND l.minPoints > :score
        ORDER BY l.minPoints ASC
        LIMIT 1
        """)
    Optional<RecognitionLevel> findNextLevelForScore(@Param("score") int score);
}
