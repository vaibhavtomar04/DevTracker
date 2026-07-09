package com.devtrack.api.repository;

import com.devtrack.api.model.SprintTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SprintTaskRepository extends JpaRepository<SprintTask, Long>, JpaSpecificationExecutor<SprintTask> {
    Optional<SprintTask> findByTaskCode(String taskCode);
}
