package com.devtrack.api.repository;

import com.devtrack.api.model.BugDeveloperFixSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BugDeveloperFixSummaryRepository extends JpaRepository<BugDeveloperFixSummary, Long> {
    Optional<BugDeveloperFixSummary> findByBugId(Long bugId);
    Optional<BugDeveloperFixSummary> findByCrId(Long crId);

    /**
     * All fix summaries for a given CR. Replaces the previous
     * findAll().stream().filter(...) full-table scan in BugController.
     */
    List<BugDeveloperFixSummary> findAllByCrId(Long crId);
}
