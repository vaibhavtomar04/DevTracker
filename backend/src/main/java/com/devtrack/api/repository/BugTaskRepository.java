package com.devtrack.api.repository;

import com.devtrack.api.model.BugTask;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BugTaskRepository extends JpaRepository<BugTask, Long> {
}
