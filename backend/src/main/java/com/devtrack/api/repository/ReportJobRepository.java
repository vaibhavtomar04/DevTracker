package com.devtrack.api.repository;

import com.devtrack.api.model.ReportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, Long> {
    Optional<ReportJob> findByJobId(String jobId);
    Optional<ReportJob> findByDownloadToken(String downloadToken);
    List<ReportJob> findByExpiresAtBefore(LocalDateTime now);
}
