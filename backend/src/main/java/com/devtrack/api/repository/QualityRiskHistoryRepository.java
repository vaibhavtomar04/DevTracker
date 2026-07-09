package com.devtrack.api.repository;

import com.devtrack.api.model.QualityRiskHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QualityRiskHistoryRepository extends JpaRepository<QualityRiskHistory, Long> {
    List<QualityRiskHistory> findByCrId(Long crId);
    Page<QualityRiskHistory> findByCrId(Long crId, Pageable pageable);
}
