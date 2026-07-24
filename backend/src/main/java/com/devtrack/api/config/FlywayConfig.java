package com.devtrack.api.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy(DataSource dataSource) {
        return flyway -> {
            log.info("Executing custom FlywayMigrationStrategy using raw DataSource connection...");
            try (Connection conn = dataSource.getConnection()) {
                log.info("Cleaning up any failed Flyway schema history entries...");
                try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM flyway_schema_history WHERE success = 0")) {
                    int deleted = stmt.executeUpdate();
                    log.info("Cleaned up {} failed flyway_schema_history entries.", deleted);
                }

                log.info("Ensuring all DevOps columns exist on tasks table...");
                String[] colDefs = {
                    "deployment_note TEXT NULL",
                    "server_path TEXT NULL",
                    "items_to_deploy TEXT NULL",
                    "expected_sit_deployment_date DATE NULL",
                    "expected_uat_deployment_date DATE NULL",
                    "rollback_count INT DEFAULT 0"
                };
                for (String colDef : colDefs) {
                    String colName = colDef.split(" ")[0];
                    try (PreparedStatement stmt = conn.prepareStatement("ALTER TABLE tasks ADD COLUMN " + colDef)) {
                        stmt.executeUpdate();
                        log.info("Successfully added missing column '{}' to tasks table.", colName);
                    } catch (Exception e) {
                        // Ignore if column already exists
                    }
                }
                
            } catch (Exception e) {
                log.warn("Could not complete Flyway cleanup strategy: {}", e.getMessage());
            }
            flyway.migrate();
        };
    }
}
