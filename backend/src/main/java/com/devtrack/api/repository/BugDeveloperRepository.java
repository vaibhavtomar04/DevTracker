package com.devtrack.api.repository;

import com.devtrack.api.model.BugDeveloper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BugDeveloperRepository extends JpaRepository<BugDeveloper, Long> {

    /**
     * Fetch all developer assignments for a given bug.
     * Used when building the full bug detail response.
     */
    List<BugDeveloper> findByBugId(Long bugId);

    /**
     * Check if a developer is already assigned to a bug.
     * Used by the idempotent assignment logic in BugController.
     */
    boolean existsByBugIdAndDeveloperId(Long bugId, Long developerId);

    /**
     * Delete all developer entries for a bug (used on bug deletion).
     */
    void deleteByBugId(Long bugId);

    /**
     * Fetch all bug-developer rows where the developer matches.
     * Enables co-developer dashboard visibility queries.
     */
    @Query("SELECT bd.bug.id FROM BugDeveloper bd WHERE bd.developer.id = :developerId")
    List<Long> findBugIdsByDeveloperId(@Param("developerId") Long developerId);
}
