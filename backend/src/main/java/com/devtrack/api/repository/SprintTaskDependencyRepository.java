package com.devtrack.api.repository;

import com.devtrack.api.model.SprintTaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SprintTaskDependencyRepository extends JpaRepository<SprintTaskDependency, Long> {
    List<SprintTaskDependency> findByTaskId(Long taskId);
    List<SprintTaskDependency> findByDependsOnTaskId(Long dependsOnTaskId);
    Optional<SprintTaskDependency> findByTaskIdAndDependsOnTaskId(Long taskId, Long dependsOnTaskId);
    void deleteByTaskIdAndDependsOnTaskId(Long taskId, Long dependsOnTaskId);
}
