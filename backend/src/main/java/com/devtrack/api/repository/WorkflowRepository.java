package com.devtrack.api.repository;

import com.devtrack.api.model.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
    List<Workflow> findByType(String type);
}
