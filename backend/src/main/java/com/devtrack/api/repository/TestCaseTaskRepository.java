package com.devtrack.api.repository;

import com.devtrack.api.model.TestCaseTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TestCaseTaskRepository extends JpaRepository<TestCaseTask, Long> {
}
