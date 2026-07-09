package com.devtrack.api.repository;

import com.devtrack.api.model.BugReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BugReviewRepository extends JpaRepository<BugReview, Long> {
    List<BugReview> findByCrId(Long crId);

    @Query("SELECT br FROM BugReview br WHERE br.developer.id = :devId AND br.reviewStatus IN ('PENDING_DEV_REVIEW', 'CHALLENGED')")
    List<BugReview> findPendingDeveloperReviews(@Param("devId") Long devId);

    long countByCrId(Long crId);
    long countByCrIdAndReviewStatus(Long crId, String status);
}
