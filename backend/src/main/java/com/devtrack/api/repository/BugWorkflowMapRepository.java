package com.devtrack.api.repository;

import com.devtrack.api.model.Bug;
import com.devtrack.api.model.BugWorkflowMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface BugWorkflowMapRepository extends JpaRepository<BugWorkflowMap, Long> {
    
    List<BugWorkflowMap> findByBugId(Long bugId);
    
    @Query("SELECT bwm FROM BugWorkflowMap bwm WHERE bwm.bug.id = :bugId AND bwm.status = 'IN_PROGRESS'")
    Optional<BugWorkflowMap> findActiveStepByBugId(@Param("bugId") Long bugId);
    
    @Query("SELECT b FROM BugWorkflowMap bwm " +
           "JOIN bwm.bug b " +
           "LEFT JOIN FETCH b.assignedDeveloper " +
           "LEFT JOIN FETCH b.workflow " +
           "WHERE bwm.stepType = :stepType AND bwm.status = 'IN_PROGRESS'")
    List<Bug> findBugsByStepType(@Param("stepType") String stepType);

    void deleteByBugId(Long bugId);
}
