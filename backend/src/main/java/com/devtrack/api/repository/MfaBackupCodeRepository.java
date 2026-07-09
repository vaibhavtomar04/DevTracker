package com.devtrack.api.repository;

import com.devtrack.api.model.MfaBackupCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MfaBackupCodeRepository extends JpaRepository<MfaBackupCode, Long> {
    List<MfaBackupCode> findByUserIdAndUsedAtIsNull(Long userId);
    
    @Transactional
    void deleteByUserId(Long userId);
}
