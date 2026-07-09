package com.devtrack.api.repository;

import com.devtrack.api.model.MfaTrustedDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MfaTrustedDeviceRepository extends JpaRepository<MfaTrustedDevice, Long> {
    List<MfaTrustedDevice> findByUserId(Long userId);
    Optional<MfaTrustedDevice> findByUserIdAndTokenHashAndExpiresAtAfter(Long userId, String tokenHash, LocalDateTime now);
    
    @Transactional
    void deleteByUserId(Long userId);
}
