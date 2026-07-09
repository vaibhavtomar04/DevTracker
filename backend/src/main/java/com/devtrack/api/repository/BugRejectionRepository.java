package com.devtrack.api.repository;

import com.devtrack.api.model.BugRejection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BugRejectionRepository extends JpaRepository<BugRejection, Long> {
    List<BugRejection> findByBugReviewId(Long bugReviewId);
}
