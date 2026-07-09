package com.devtrack.api.repository;

import com.devtrack.api.model.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ConfigRepository extends JpaRepository<AppConfig, Long> {
    Optional<AppConfig> findByConfigKey(String configKey);
}
