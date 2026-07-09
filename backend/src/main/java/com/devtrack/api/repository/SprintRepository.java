package com.devtrack.api.repository;

import com.devtrack.api.model.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {
    Optional<Sprint> findByStatus(String status);
    List<Sprint> findAllByOrderByCreatedDateDesc();
}
