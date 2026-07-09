package com.devtrack.api.repository;

import com.devtrack.api.model.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

import com.devtrack.api.model.User;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Task> {
    @Query("SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester")
    List<Task> findAllOptimized();

    @Query(value = "SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester",
           countQuery = "SELECT COUNT(t) FROM Task t")
    Page<Task> findAllOptimized(Pageable pageable);

    @Query(value = "SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "WHERE t.status not in :status",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.status not in :status")
    Page<Task> findAllOptimizedByStatusNotIn(@Param("status") List<String> status, Pageable pageable);

    @Query(value = "SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "WHERE t.assignedDeveloper.id = :devId",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.assignedDeveloper.id = :devId")
    Page<Task> findAllOptimizedByAssignedDeveloperId(@Param("devId") Long devId, Pageable pageable);

    @Query(value = "SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "WHERE t.assignedDeveloper.id = :devId AND t.status not in :status",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.assignedDeveloper.id = :devId AND t.status not in :status")
    Page<Task> findAllOptimizedByAssignedDeveloperIdAndStatusNot(@Param("devId") Long devId, @Param("status") List<String> status, Pageable pageable);

    @Query(value = "SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN FETCH t.type " +
            "LEFT JOIN FETCH t.assignedDeveloper " +
            "LEFT JOIN FETCH t.createdBy " +
            "LEFT JOIN FETCH t.workflow " +
            "LEFT JOIN FETCH t.tester " +
            "WHERE t.assignedDeveloper.id = :devId AND t.status in :status",
            countQuery = "SELECT COUNT(t) FROM Task t WHERE t.assignedDeveloper.id = :devId AND t.status in :status")
     Page<Task> findAllOptimizedByAssignedDeveloperIdAndStatusIn(@Param("devId") Long devId, @Param("status") List<String> status, Pageable pageable);
    
    @Query(value = "SELECT DISTINCT t FROM Task t " +
    		"LEFT JOIN FETCH t.type " +
    		"LEFT JOIN FETCH t.assignedDeveloper " +
    		"LEFT JOIN FETCH t.createdBy " +
    		"LEFT JOIN FETCH t.workflow " +
    		"LEFT JOIN FETCH t.tester " +
    		"WHERE t.assignedDeveloper.id = :devId AND t.status in :status and t.priority=:priority",
    		countQuery = "SELECT COUNT(t) FROM Task t WHERE t.assignedDeveloper.id = :devId AND t.status in :status and t.priority=:priority")
    Page<Task> findAllOptimizedByDeveloperAndStatusAndPriority(@Param("devId") Long devId, @Param("status") List<String> status, @Param("priority") String priority, Pageable pageable);
    
    @Query(value = "SELECT DISTINCT t FROM Task t " +
    		"LEFT JOIN FETCH t.type " +
    		"LEFT JOIN FETCH t.assignedDeveloper " +
    		"LEFT JOIN FETCH t.createdBy " +
    		"LEFT JOIN FETCH t.workflow " +
    		"LEFT JOIN FETCH t.tester " +
    		"WHERE t.assignedDeveloper.id = :devId AND t.priority=:priority",
    		countQuery = "SELECT COUNT(t) FROM Task t WHERE t.assignedDeveloper.id = :devId and t.priority=:priority")
    Page<Task> findAllOptimizedByDeveloperAndPriority(@Param("devId") Long devId, @Param("priority") String priority, Pageable pageable);
    
    @Query(value = "SELECT DISTINCT t FROM Task t " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.createdBy " +
           "LEFT JOIN FETCH t.workflow " +
           "LEFT JOIN FETCH t.tester " +
           "WHERE t.status in :status",
           countQuery = "SELECT COUNT(t) FROM Task t WHERE t.status in :status")
    Page<Task> findAllOptimizedByStatusIn(@Param("status") List<String> status, Pageable pageable);
    
    @Query(value = "SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN FETCH t.type " +
            "LEFT JOIN FETCH t.assignedDeveloper " +
            "LEFT JOIN FETCH t.createdBy " +
            "LEFT JOIN FETCH t.workflow " +
            "LEFT JOIN FETCH t.tester " +
            "WHERE t.priority=:priority",
            countQuery = "SELECT COUNT(t) FROM Task t WHERE t.priority=:priority")
     Page<Task> findAllOptimizedByPriority(@Param("priority") String priority, Pageable pageable);
    
    @Query(value = "SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN FETCH t.type " +
            "LEFT JOIN FETCH t.assignedDeveloper " +
            "LEFT JOIN FETCH t.createdBy " +
            "LEFT JOIN FETCH t.workflow " +
            "LEFT JOIN FETCH t.tester " +
            "WHERE t.status in :status and t.priority=:priority",
            countQuery = "SELECT COUNT(t) FROM Task t WHERE t.status in :status and t.priority=:priority")
     Page<Task> findAllOptimizedByStatusAndPriority(@Param("status") List<String> status, @Param("priority") String priority,Pageable pageable);

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
            "   OR LOWER(t.assignedDeveloper.fullName) LIKE LOWER(CONCAT('%', :q, '%'))",
            countQuery = "SELECT COUNT(t) FROM Task t " +
            "WHERE LOWER(t.jtrackId) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.branchName) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(t.assignedDeveloper.fullName) LIKE LOWER(CONCAT('%', :q, '%'))")
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
}
