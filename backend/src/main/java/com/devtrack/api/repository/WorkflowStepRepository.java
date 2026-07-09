package com.devtrack.api.repository;

import com.devtrack.api.model.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Long> {
}
