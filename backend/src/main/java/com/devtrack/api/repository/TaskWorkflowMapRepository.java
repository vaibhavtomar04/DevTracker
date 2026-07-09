package com.devtrack.api.repository;

import com.devtrack.api.model.Task;
import com.devtrack.api.model.TaskWorkflowMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TaskWorkflowMapRepository extends JpaRepository<TaskWorkflowMap, Long> {
    
    List<TaskWorkflowMap> findByTaskId(Long taskId);
    
    @Query("SELECT twm FROM TaskWorkflowMap twm WHERE twm.task.id = :taskId AND twm.status = 'IN_PROGRESS'")
    Optional<TaskWorkflowMap> findActiveStepByTaskId(@Param("taskId") Long taskId);
    
    @Query("SELECT t FROM TaskWorkflowMap twm " +
           "JOIN twm.task t " +
           "LEFT JOIN FETCH t.assignedDeveloper " +
           "LEFT JOIN FETCH t.type " +
           "LEFT JOIN FETCH t.workflow " +
           "WHERE twm.stepType = :stepType AND twm.status = 'IN_PROGRESS'")
    List<Task> findTasksByStepType(@Param("stepType") String stepType);

    void deleteByTaskId(Long taskId);
}
