package com.devtrack.api.repository;

import com.devtrack.api.model.TaskWorkflowHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskWorkflowHistoryRepository extends JpaRepository<TaskWorkflowHistory, Long> {
    List<TaskWorkflowHistory> findByTaskIdOrderByTimestampDesc(Long taskId);
}
