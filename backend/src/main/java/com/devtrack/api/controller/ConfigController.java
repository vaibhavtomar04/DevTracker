package com.devtrack.api.controller;

import com.devtrack.api.model.AppConfig;
import com.devtrack.api.repository.ConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/configs")
public class ConfigController {

    @Autowired
    private ConfigRepository configRepository;

    @GetMapping
    public List<AppConfig> getAllConfigs() {
        return configRepository.findAll();
    }

    @GetMapping("/{key}")
    public ResponseEntity<AppConfig> getConfigByKey(@PathVariable String key) {
        return configRepository.findByConfigKey(key)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVADMIN')")
    public AppConfig createOrUpdateConfig(@RequestBody AppConfig config) {
        return configRepository.findByConfigKey(config.getConfigKey())
                .map(existing -> {
                    existing.setConfigValue(config.getConfigValue());
                    existing.setDescription(config.getDescription());
                    return configRepository.save(existing);
                })
                .orElseGet(() -> configRepository.save(config));
    }
}
