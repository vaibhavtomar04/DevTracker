package com.devtrack.api.repository;

import com.devtrack.api.model.BugDeveloperFixSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BugDeveloperFixSummaryRepository extends JpaRepository<BugDeveloperFixSummary, Long> {
    Optional<BugDeveloperFixSummary> findByBugId(Long bugId);
    Optional<BugDeveloperFixSummary> findByCrId(Long crId);
}
