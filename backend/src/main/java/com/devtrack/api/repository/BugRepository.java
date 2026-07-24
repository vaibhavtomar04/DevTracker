package com.devtrack.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devtrack.api.model.Bug;

@Repository
public interface BugRepository extends JpaRepository<Bug, Long> {

    Optional<Bug> findByJtrackId(String jtrackId);

    @Query("SELECT DISTINCT b FROM Bug b " +
           "LEFT JOIN FETCH b.bugTask " +
           "LEFT JOIN FETCH b.raisedBy " +
           "LEFT JOIN FETCH b.assignedDeveloper " +
           "LEFT JOIN FETCH b.workflow " +
           "LEFT JOIN FETCH b.tester")
    List<Bug> findAllOptimized();

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
           "LEFT JOIN FETCH b.bugTask " +
           "LEFT JOIN FETCH b.raisedBy " +
           "LEFT JOIN FETCH b.assignedDeveloper " +
           "LEFT JOIN FETCH b.workflow " +
           "LEFT JOIN FETCH b.tester",
           countQuery = "SELECT COUNT(b) FROM Bug b")
    Page<Bug> findAllOptimized(Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
           "LEFT JOIN FETCH b.bugTask " +
           "LEFT JOIN FETCH b.raisedBy " +
           "LEFT JOIN FETCH b.assignedDeveloper " +
           "LEFT JOIN FETCH b.workflow " +
           "LEFT JOIN FETCH b.tester " +
           "WHERE b.status NOT IN ('CLOSED', 'VERIFIED', 'INVALID_BUG')",
           countQuery = "SELECT COUNT(b) FROM Bug b WHERE b.status NOT IN ('CLOSED', 'VERIFIED', 'INVALID_BUG')")
    Page<Bug> findAllOptimizedActive(Pageable pageable);

    /**
     * Fetch all bugs assigned to a developer (via direct assignment, bug_developers pool,
     * or parent CR task_developers pool). Any one match is sufficient.
     */
    @Query(value = "SELECT DISTINCT b FROM Bug b " +
           "LEFT JOIN FETCH b.bugTask " +
           "LEFT JOIN FETCH b.raisedBy " +
           "LEFT JOIN FETCH b.assignedDeveloper " +
           "LEFT JOIN FETCH b.workflow " +
           "LEFT JOIN FETCH b.tester " +
           "WHERE (b.assignedDeveloper.id = :devId " +
           "  OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) " +
           "  OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId))",
           countQuery = "SELECT COUNT(b) FROM Bug b WHERE (b.assignedDeveloper.id = :devId " +
           "  OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) " +
           "  OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId))")
    Page<Bug> findAllOptimizedByAssignedDeveloperId(@Param("devId") Long devId, Pageable pageable);

    /**
     * Same as above but restricted to non-terminal bugs (active bugs for developer dashboard).
     */
    @Query(value = "SELECT DISTINCT b FROM Bug b " +
           "LEFT JOIN FETCH b.bugTask " +
           "LEFT JOIN FETCH b.raisedBy " +
           "LEFT JOIN FETCH b.assignedDeveloper " +
           "LEFT JOIN FETCH b.workflow " +
           "LEFT JOIN FETCH b.tester " +
           "WHERE (b.assignedDeveloper.id = :devId " +
           "  OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) " +
           "  OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) " +
           "AND b.status NOT IN ('CLOSED', 'VERIFIED', 'INVALID_BUG')",
           countQuery = "SELECT COUNT(b) FROM Bug b WHERE (b.assignedDeveloper.id = :devId " +
           "  OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) " +
           "  OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) " +
           "AND b.status NOT IN ('CLOSED', 'VERIFIED', 'INVALID_BUG')")
    Page<Bug> findAllOptimizedByAssignedDeveloperIdAndActive(@Param("devId") Long devId, Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
               "LEFT JOIN FETCH b.bugTask " +
               "LEFT JOIN FETCH b.raisedBy " +
               "LEFT JOIN FETCH b.assignedDeveloper " +
               "LEFT JOIN FETCH b.workflow " +
               "LEFT JOIN FETCH b.tester " +
               "WHERE b.status =:status and b.severity=:severity",
               countQuery = "SELECT COUNT(b) FROM Bug b WHERE b.status =:status and b.severity=:severity")
    Page<Bug> findAllOptimizedByStatusAndSeverity(String status, String severity, Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
               "LEFT JOIN FETCH b.bugTask " +
               "LEFT JOIN FETCH b.raisedBy " +
               "LEFT JOIN FETCH b.assignedDeveloper " +
               "LEFT JOIN FETCH b.workflow " +
               "LEFT JOIN FETCH b.tester " +
               "WHERE b.status =:status",
               countQuery = "SELECT COUNT(b) FROM Bug b WHERE b.status =:status")
    Page<Bug> findAllOptimizedByStatus(String status, Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
               "LEFT JOIN FETCH b.bugTask " +
               "LEFT JOIN FETCH b.raisedBy " +
               "LEFT JOIN FETCH b.assignedDeveloper " +
               "LEFT JOIN FETCH b.workflow " +
               "LEFT JOIN FETCH b.tester " +
               "WHERE b.severity=:severity",
               countQuery = "SELECT COUNT(b) FROM Bug b WHERE b.severity=:severity")
    Page<Bug> findAllOptimizedBySeverity(String severity, Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
               "LEFT JOIN FETCH b.bugTask " +
               "LEFT JOIN FETCH b.raisedBy " +
               "LEFT JOIN FETCH b.assignedDeveloper " +
               "LEFT JOIN FETCH b.workflow " +
               "LEFT JOIN FETCH b.tester " +
               "WHERE (b.assignedDeveloper.id = :devId OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) AND b.status =:status AND b.severity=:severity",
               countQuery = "SELECT COUNT(b) FROM Bug b WHERE (b.assignedDeveloper.id = :devId OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) and b.status =:status AND b.severity=:severity")
    Page<Bug> findAllOptimizedByDeveloperStatusAndSeverity(@Param("devId") Long devId, String status, String severity, Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
               "LEFT JOIN FETCH b.bugTask " +
               "LEFT JOIN FETCH b.raisedBy " +
               "LEFT JOIN FETCH b.assignedDeveloper " +
               "LEFT JOIN FETCH b.workflow " +
               "LEFT JOIN FETCH b.tester " +
               "WHERE (b.assignedDeveloper.id = :devId OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) AND b.status =:status",
               countQuery = "SELECT COUNT(b) FROM Bug b WHERE (b.assignedDeveloper.id = :devId OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) and b.status =:status")
    Page<Bug> findAllOptimizedByDeveloperStatus(@Param("devId") Long devId, String status, Pageable pageable);

    @Query(value = "SELECT DISTINCT b FROM Bug b " +
               "LEFT JOIN FETCH b.bugTask " +
               "LEFT JOIN FETCH b.raisedBy " +
               "LEFT JOIN FETCH b.assignedDeveloper " +
               "LEFT JOIN FETCH b.workflow " +
               "LEFT JOIN FETCH b.tester " +
               "WHERE (b.assignedDeveloper.id = :devId OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) AND b.severity=:severity",
               countQuery = "SELECT COUNT(b) FROM Bug b WHERE (b.assignedDeveloper.id = :devId OR EXISTS (SELECT bd FROM BugDeveloper bd WHERE bd.bug = b AND bd.developer.id = :devId) OR EXISTS (SELECT td FROM TaskDeveloper td WHERE td.task = b.bugTask AND td.developer.id = :devId)) AND b.severity=:severity")
    Page<Bug> findAllOptimizedByDeveloperSeverity(@Param("devId") Long devId, String severity, Pageable pageable);

    long countByBugTaskId(Long bugTaskId);

    @Query("SELECT COUNT(b) FROM Bug b WHERE b.status NOT IN ('CLOSED', 'VERIFIED', 'INVALID_BUG')")
    long countActiveBugs();

    List<Bug> findByBugTaskId(Long bugTaskId);

    /**
     * Count active bugs assigned to a specific developer (MINE scope).
     * Checks: direct assignment sentinel, bug_developers pool, parent CR task_developers pool.
     * Active = NOT in terminal states: CLOSED, VERIFIED, INVALID_BUG.
     */
    @Query(value = """
        SELECT COUNT(DISTINCT b.id) FROM bugs b
        WHERE b.status NOT IN ('CLOSED','VERIFIED','INVALID_BUG')
          AND (b.assigned_developer_id = :userId
               OR EXISTS (
                   SELECT 1 FROM bug_developers bd
                   WHERE bd.bug_id = b.id AND bd.developer_id = :userId
               )
               OR EXISTS (
                   SELECT 1 FROM task_developers td
                   JOIN tasks t ON td.task_id = t.id
                   WHERE t.id = b.bug_task_id
                     AND td.developer_id = :userId
               ))
        """, nativeQuery = true)
    long countActiveBugsForUser(@Param("userId") Long userId);
}
