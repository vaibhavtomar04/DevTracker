package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.LeaderboardSnapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaderboardSnapshotRepository extends JpaRepository<LeaderboardSnapshot, Long> {

    /**
     * Latest snapshot for a given period type — filters by score_visibility via JOIN.
     * Only users with TEAM or PUBLIC visibility are included (spec §16).
     */
    @Query("""
        SELECT ls FROM LeaderboardSnapshot ls
        JOIN RecognitionScore rs ON rs.user.id = ls.user.id
        WHERE ls.periodType = :periodType
          AND ls.snapshotDate = :snapshotDate
          AND ls.activeFlag = 1
          AND rs.scoreVisibility IN ('TEAM', 'PUBLIC')
        ORDER BY ls.rankPosition ASC
        """)
    Page<LeaderboardSnapshot> findLatestVisibleSnapshot(
            @Param("periodType") String periodType,
            @Param("snapshotDate") LocalDate snapshotDate,
            Pageable pageable);

    /**
     * Most recent snapshot date for a period type — used before every query
     * to avoid stale-date hardcoding.
     */
    @Query("""
        SELECT MAX(ls.snapshotDate) FROM LeaderboardSnapshot ls
        WHERE ls.periodType = :periodType AND ls.activeFlag = 1
        """)
    LocalDate findLatestSnapshotDate(@Param("periodType") String periodType);

    /** All snapshots for a specific user — used by profile & admin analytics. */
    List<LeaderboardSnapshot> findByUserIdAndPeriodTypeAndActiveFlagOrderBySnapshotDateDesc(
            Long userId, String periodType, int activeFlag);

    /** Admin analytics — top N users for a given snapshot date and period. */
    List<LeaderboardSnapshot> findTop10ByPeriodTypeAndSnapshotDateAndActiveFlagOrderByRankPositionAsc(
            String periodType, LocalDate snapshotDate, int activeFlag);
}
