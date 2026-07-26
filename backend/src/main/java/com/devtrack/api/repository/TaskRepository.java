package com.devtrack.api.repository;

import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Task> {

    // -- Single-entity optimized fetches (no pagination -> safe collection fetch) --

    @Query("SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "LEFT JOIN FETCH t.developers td " +
           "LEFT JOIN FETCH td.developer")
    List<Task> findAllOptimized();

    @Query("SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "LEFT JOIN FETCH t.developers td " +
           "LEFT JOIN FETCH td.developer " +
           "WHERE t.id = :id")
    java.util.Optional<Task> findByIdOptimized(@Param("id") Long id);

    // ==== Phase 5: two-step ID pagination (avoids HHH90003004 in-memory pagination) ====
    // Combining a collection JOIN FETCH (t.developers) with a Pageable forces Hibernate
    // to load the whole result set and paginate in memory. Instead:
    //   Step 1: paginate Task IDs in the DB (no collection fetch).
    //   Step 2: hydrate full entities WITH collection joins for those IDs (unpaginated).
    // The public paginated methods below are default methods that keep their original
    // signatures, so no service/controller callers need to change.

    @Query("SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "LEFT JOIN FETCH t.developers td " +
           "LEFT JOIN FETCH td.developer " +
           "WHERE t.id IN :ids")
    List<Task> findByIdsWithDetails(@Param("ids") List<Long> ids);

    private Page<Task> hydratePage(Page<Long> idPage, Pageable pageable) {
        List<Long> ids = idPage.getContent();
        if (ids.isEmpty()) {
            return new PageImpl<>(java.util.Collections.emptyList(), pageable, idPage.getTotalElements());
        }
        List<Task> tasks = findByIdsWithDetails(ids);
        java.util.Map<Long, Task> byId = new java.util.HashMap<>();
        for (Task t : tasks) {
            byId.put(t.getId(), t);
        }
        List<Task> ordered = new java.util.ArrayList<>(ids.size());
        for (Long id : ids) {
            Task t = byId.get(id);
            if (t != null) {
                ordered.add(t);
            }
        }
        return new PageImpl<>(ordered, pageable, idPage.getTotalElements());
    }

    // -- Step 1 queries: paginate IDs only (DB-side pagination) --

    @Query(value = "SELECT t.id FROM Task t",
           countQuery = "SELECT COUNT(t) FROM Task t")
    Page<Long> findIdsAll(Pageable pageable);

    @Query(value = "SELECT t.id FROM Task t WHERE t.status not in :status",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.status not in :status")
    Page<Long> findIdsByStatusNotIn(@Param("status") List<String> status, Pageable pageable);

    @Query(value = "SELECT DISTINCT t.id FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId))",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId))")
    Page<Long> findIdsByAssignedDeveloperId(@Param("devId") Long devId, Pageable pageable);

    @Query(value = "SELECT DISTINCT t.id FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.status not in :status",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.status not in :status")
    Page<Long> findIdsByAssignedDeveloperIdAndStatusNot(@Param("devId") Long devId, @Param("status") List<String> status, Pageable pageable);

    @Query(value = "SELECT DISTINCT t.id FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.status in :status",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.status in :status")
    Page<Long> findIdsByAssignedDeveloperIdAndStatusIn(@Param("devId") Long devId, @Param("status") List<String> status, Pageable pageable);

    @Query(value = "SELECT DISTINCT t.id FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.status in :status and t.priority=:priority",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.status in :status and t.priority=:priority")
    Page<Long> findIdsByDeveloperAndStatusAndPriority(@Param("devId") Long devId, @Param("status") List<String> status, @Param("priority") String priority, Pageable pageable);

    @Query(value = "SELECT DISTINCT t.id FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) AND t.priority=:priority",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.assignedDeveloper.id = :devId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :devId)) and t.priority=:priority")
    Page<Long> findIdsByDeveloperAndPriority(@Param("devId") Long devId, @Param("priority") String priority, Pageable pageable);

    @Query(value = "SELECT t.id FROM Task t WHERE t.status in :status",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.status in :status")
    Page<Long> findIdsByStatusIn(@Param("status") List<String> status, Pageable pageable);

    @Query(value = "SELECT t.id FROM Task t WHERE t.priority=:priority",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.priority=:priority")
    Page<Long> findIdsByPriority(@Param("priority") String priority, Pageable pageable);

    @Query(value = "SELECT t.id FROM Task t WHERE t.status in :status and t.priority=:priority",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.status in :status and t.priority=:priority")
    Page<Long> findIdsByStatusAndPriority(@Param("status") List<String> status, @Param("priority") String priority, Pageable pageable);

    @Query(value = "SELECT t.id FROM Task t ORDER BY t.id DESC",
           countQuery = "SELECT COUNT(t) FROM Task t")
    Page<Long> findIdsRecent(Pageable pageable);

    @Query(value = "SELECT t.id FROM Task t " +
           "WHERE (t.assignedDeveloper.id = :userId OR t.tester.id = :userId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :userId)) " +
           "AND t.status NOT IN :excludedStatuses " +
           "ORDER BY t.id DESC",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t WHERE (t.assignedDeveloper.id = :userId OR t.tester.id = :userId OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND subTd.developer.id = :userId)) AND t.status NOT IN :excludedStatuses")
    Page<Long> findIdsPendingForUser(@Param("userId") Long userId, @Param("excludedStatuses") List<String> excludedStatuses, Pageable pageable);

    // -- Public paginated methods (unchanged signatures, now two-step) --

    default Page<Task> findAllOptimized(Pageable pageable) {
        return hydratePage(findIdsAll(pageable), pageable);
    }

    default Page<Task> findAllOptimizedByStatusNotIn(List<String> status, Pageable pageable) {
        return hydratePage(findIdsByStatusNotIn(status, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByAssignedDeveloperId(Long devId, Pageable pageable) {
        return hydratePage(findIdsByAssignedDeveloperId(devId, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByAssignedDeveloperIdAndStatusNot(Long devId, List<String> status, Pageable pageable) {
        return hydratePage(findIdsByAssignedDeveloperIdAndStatusNot(devId, status, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByAssignedDeveloperIdAndStatusIn(Long devId, List<String> status, Pageable pageable) {
        return hydratePage(findIdsByAssignedDeveloperIdAndStatusIn(devId, status, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByDeveloperAndStatusAndPriority(Long devId, List<String> status, String priority, Pageable pageable) {
        return hydratePage(findIdsByDeveloperAndStatusAndPriority(devId, status, priority, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByDeveloperAndPriority(Long devId, String priority, Pageable pageable) {
        return hydratePage(findIdsByDeveloperAndPriority(devId, priority, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByStatusIn(List<String> status, Pageable pageable) {
        return hydratePage(findIdsByStatusIn(status, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByPriority(String priority, Pageable pageable) {
        return hydratePage(findIdsByPriority(priority, pageable), pageable);
    }

    default Page<Task> findAllOptimizedByStatusAndPriority(List<String> status, String priority, Pageable pageable) {
        return hydratePage(findIdsByStatusAndPriority(status, priority, pageable), pageable);
    }

    default Page<Task> findRecentTasks(Pageable pageable) {
        return hydratePage(findIdsRecent(pageable), pageable);
    }

    default Page<Task> findPendingTasksForUser(Long userId, List<String> excludedStatuses, Pageable pageable) {
        return hydratePage(findIdsPendingForUser(userId, excludedStatuses, pageable), pageable);
    }

    @Query("SELECT COUNT(t) FROM Task t WHERE t.status IN :statuses")
    long countByStatusIn(@Param("statuses") List<String> statuses);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.status NOT IN :statuses")
    long countByStatusNotIn(@Param("statuses") List<String> statuses);

    /**
     * Full-text search used by the Command Palette.
     * Searches across: jtrackId, title, description, branch name, developer name, tester name.
     */
    @Query(value = "SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN FETCH t.type " +
            "LEFT JOIN FETCH t.assignedDeveloper " +
            "LEFT JOIN FETCH t.createdBy " +
            "LEFT JOIN FETCH t.workflow " +
            "LEFT JOIN FETCH t.tester " +
            "WHERE LOWER(t.jtrackId) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.branchName) LIKE LOWER(CONCAT('%', :q, '%')) " +
"   OR LOWER(t.assignedDeveloper.fullName) LIKE LOWER(CONCAT('%', :q, '%')) " +
"   OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND LOWER(subTd.developer.fullName) LIKE LOWER(CONCAT('%', :q, '%')))",
            countQuery = "SELECT COUNT(t) FROM Task t " +
            "WHERE LOWER(t.jtrackId) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.branchName) LIKE LOWER(CONCAT('%', :q, '%')) " +
"   OR LOWER(t.assignedDeveloper.fullName) LIKE LOWER(CONCAT('%', :q, '%')) " +
"   OR EXISTS (SELECT subTd FROM TaskDeveloper subTd WHERE subTd.task = t AND LOWER(subTd.developer.fullName) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Task> searchAll(@Param("q") String query, Pageable pageable);

    List<Task> findBySprintId(Long sprintId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE Task t SET t.tester = :tester, t.status = 'TESTING_IN_PROGRESS', t.isInPool = false, t.testingStartedDate = CURRENT_TIMESTAMP, t.updatedDate = CURRENT_TIMESTAMP WHERE t.id = :taskId AND t.status = 'TESTING_POOL' AND t.tester IS NULL")
    int assignTesterAtomically(@Param("taskId") Long taskId, @Param("tester") User tester);

    @Query(value = "SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "WHERE t.isQualityRisk = true",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.isQualityRisk = true")
    Page<Task> findAtRiskCrs(Pageable pageable);

    boolean existsByJtrackId(String jtrackId);

    @Query("SELECT t.jtrackId FROM Task t WHERE t.jtrackId LIKE CONCAT(:prefix, '%')")
    List<String> findJtrackIdsByPrefix(@Param("prefix") String prefix);

    // -- Dashboard Aggregate Count Queries (native SQL for speed) --

    /**
     * Count tasks in a given sprint -- replaces full entity load for sprint summary.
     */
    @Query(value = "SELECT COUNT(*) FROM tasks WHERE sprint_id = :sprintId", nativeQuery = true)
    int countBySprintIdNative(@Param("sprintId") Long sprintId);

    /**
     * Count completed tasks in a given sprint -- terminal statuses only.
     */
    @Query(value = "SELECT COUNT(*) FROM tasks WHERE sprint_id = :sprintId AND status IN ('CLOSED','PROD_DEPLOYED','PROD_COMPLETED')", nativeQuery = true)
    int countCompletedBySprintIdNative(@Param("sprintId") Long sprintId);

    /**
     * Scope=MINE: count active (non-terminal) tasks assigned to a specific user.
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.id) FROM tasks t
        WHERE (t.assigned_developer_id = :userId
               OR t.tester_id = :userId
               OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
          AND t.status NOT IN ('CLOSED', 'PROD_COMPLETED')
        """, nativeQuery = true)
    long countActiveCrsForUser(@Param("userId") Long userId);

    /**
     * Scope=MINE: count tasks pending approval (CODE_REVIEW or PENDING_APPROVAL) for a user.
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.id) FROM tasks t
        WHERE (t.assigned_developer_id = :userId
               OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
          AND t.status IN ('PENDING_APPROVAL','CODE_REVIEW')
        """, nativeQuery = true)
    long countPendingApprovalCrsForUser(@Param("userId") Long userId);

    /**
     * Scope=MINE: count completed/closed tasks for a user (UAT_TESTING or PROD_DEPLOYED or beyond).
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.id) FROM tasks t
        WHERE (t.assigned_developer_id = :userId
               OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
          AND t.status IN ('UAT_TESTING','PROD_DEPLOYED','PROD_COMPLETED','CLOSED')
        """, nativeQuery = true)
    long countCompletedUatCrsForUser(@Param("userId") Long userId);

    /**
 * Dashboard "Recent CRs" projection -- 7 columns, no entity hydration.
 * Avoids loading 50+ columns and 7 JOINs just for the dashboard recent list.
 * Returns: id, jtrack_id, title, priority, status, updated_date, assigned_developer_name
 *
 * Multi-developer co-ownership: assigned_developer_name is the comma-joined
 * union of {assignedDeveloper} and {task_developers}, deduped and ordered by name.
 * Single-dev CRs (N=1, empty task_developers) fall back to the legacy
 * assigned_developer_id mirror, so the output is byte-identical for them.
 */
@Query(value = """
    SELECT t.id, t.jtrack_id, t.title, t.priority, t.status, t.updated_date,
           GROUP_CONCAT(DISTINCT du.full_name ORDER BY du.full_name SEPARATOR ', ') AS assigned_developer_name
    FROM tasks t
    LEFT JOIN (
        SELECT t2.id AS task_id, t2.assigned_developer_id AS dev_id
        FROM tasks t2
        WHERE t2.assigned_developer_id IS NOT NULL
        UNION
        SELECT td.task_id, td.developer_id
        FROM task_developers td
    ) dv ON dv.task_id = t.id
    LEFT JOIN users du ON du.id = dv.dev_id
    GROUP BY t.id, t.jtrack_id, t.title, t.priority, t.status, t.updated_date
    ORDER BY t.id DESC
    LIMIT :lim
    """, nativeQuery = true)
    List<Object[]> findRecentTaskProjections(@Param("lim") int limit);

    /**
     * Dashboard "Pending Tasks for user" projection -- 6 columns, no entity hydration.
     * Returns: id, jtrack_id, title, priority, status, due_date
     */
    @Query(value = """
        SELECT t.id, t.jtrack_id, t.title, t.priority, t.status, t.due_date
        FROM tasks t
        WHERE (t.assigned_developer_id = :userId
               OR t.tester_id = :userId
               OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
          AND t.status NOT IN (:excluded1, :excluded2)
        ORDER BY t.id DESC
        LIMIT 5
        """, nativeQuery = true)
    List<Object[]> findPendingTaskProjectionsForUser(
        @Param("userId") Long userId,
        @Param("excluded1") String excluded1,
        @Param("excluded2") String excluded2
    );

    // -- Recognition Score metric queries --
    // All use native SQL for aggregate performance.
    // Spec section 13: escaped-defect penalties apply to PRODUCTION-escaped bugs only.

    /** CRs in terminal success states (PROD_COMPLETED or CLOSED) for a developer. */
@Query(value = """
    SELECT COUNT(*) FROM tasks t
    WHERE (t.assigned_developer_id = :userId
           OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
      AND t.status IN ('PROD_COMPLETED','CLOSED')
    """, nativeQuery = true)
int countSuccessfulCrsForUser(@Param("userId") Long userId);

    /** All CRs ever assigned to this developer (for rate denominators). */
    @Query(value = """
    SELECT COUNT(*) FROM tasks t
    WHERE (t.assigned_developer_id = :userId
           OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
    """, nativeQuery = true)
int countCrsAssignedToUser(@Param("userId") Long userId);

    /**
     * CRs approved first-time: reached SIT_DEPLOYED/UAT_DEPLOYED without ever
     * having a CHANGES_REQUESTED row in task_workflow_history.
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.id) FROM tasks t
WHERE (t.assigned_developer_id = :userId
       OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
  AND t.status IN ('SIT_DEPLOYED','UAT_DEPLOYED','SIT_COMPLETED',
                           'UAT_COMPLETED','PROD_DEPLOYED','PROD_COMPLETED','CLOSED')
          AND NOT EXISTS (
              SELECT 1 FROM task_workflow_history h
              WHERE h.task_id = t.id
                AND h.to_status = 'CHANGES_REQUESTED'
          )
        """, nativeQuery = true)
    int countFirstPassApprovedCrsForUser(@Param("userId") Long userId);

    /** Prod deployments: CRs that reached PROD_DEPLOYED or beyond. */
    @Query(value = """
        SELECT COUNT(*) FROM tasks t
WHERE (t.assigned_developer_id = :userId
       OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
  AND t.status IN ('PROD_DEPLOYED','PROD_COMPLETED','CLOSED')
        """, nativeQuery = true)
    int countProdDeploymentsForUser(@Param("userId") Long userId);

    /** Successful prod deployments: reached PROD_DEPLOYED with rollback_count = 0 and no rollback history. */
    @Query(value = """
        SELECT COUNT(*) FROM tasks t
WHERE (t.assigned_developer_id = :userId
       OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
  AND t.status IN ('PROD_DEPLOYED','PROD_COMPLETED','CLOSED')
  AND (t.rollback_count IS NULL OR t.rollback_count = 0)
          AND NOT EXISTS (
              SELECT 1 FROM task_workflow_history h
              WHERE h.task_id = t.id
                AND (h.remarks LIKE '%ROLLBACK%' OR h.remarks LIKE '%Rollback%')
          )
        """, nativeQuery = true)
    int countSuccessfulProdDeploymentsForUser(@Param("userId") Long userId);

    /**
     * Distinct sprints the developer participated in (had at least one task).
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.sprint_id) FROM tasks t
WHERE (t.assigned_developer_id = :userId
       OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
  AND t.sprint_id IS NOT NULL
        """, nativeQuery = true)
    int countSprintsForUser(@Param("userId") Long userId);

    /**
     * Sprints where all tasks for this developer were completed before sprint end_date.
     * A sprint is "on time" when every task's actual production date <= sprint end_date.
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.sprint_id)
        FROM tasks t
        JOIN sprints s ON t.sprint_id = s.id
        WHERE (t.assigned_developer_id = :userId
       OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
  AND t.sprint_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM tasks t2
      WHERE (t2.assigned_developer_id = :userId
             OR EXISTS (SELECT 1 FROM task_developers td2 WHERE td2.task_id = t2.id AND td2.developer_id = :userId))
        AND t2.sprint_id = t.sprint_id
                AND (t2.production_date IS NULL OR t2.production_date > s.end_date)
          )
        """, nativeQuery = true)
    int countOnTimeSprintsForUser(@Param("userId") Long userId);

    /**
     * CRs with at least one production-escaped bug.
     */
    @Query(value = """
        SELECT COUNT(DISTINCT t.id) FROM tasks t
WHERE (t.assigned_developer_id = :userId
       OR EXISTS (SELECT 1 FROM task_developers td WHERE td.task_id = t.id AND td.developer_id = :userId))
  AND EXISTS (
      SELECT 1 FROM bugs b
              WHERE b.bug_task_id = t.id
                AND b.status NOT IN ('REJECTED','INVALID')
          )
        """, nativeQuery = true)
    int countProdEscapedDefectCrsForUser(@Param("userId") Long userId);

    /** All bugs on the user's CRs (for reopen-rate denominator). */
    @Query(value = """
        SELECT COUNT(*) FROM bugs b
    JOIN tasks t ON b.bug_task_id = t.id
    WHERE (t.assigned_developer_id = :userId
           OR EXISTS (SELECT 1 FROM task_develop