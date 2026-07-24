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
                
                log.info("Cleaning up any partially created tasks columns from the failed migration...");
                try (PreparedStatement stmt = conn.prepareStatement("ALTER TABLE tasks DROP COLUMN deployment_note")) {
                    stmt.executeUpdate();
                    log.info("Dropped deployment_note column.");
                } catch (Exception e) {
                    // Ignore if it doesn't exist
                }
                try (PreparedStatement stmt = conn.prepareStatement("ALTER TABLE tasks DROP COLUMN server_path")) {
                    stmt.executeUpdate();
                    log.info("Dropped server_path column.");
                } catch (Exception e) {
                    // Ignore if it doesn't exist
                }
                try (PreparedStatement stmt = conn.prepareStatement("ALTER TABLE tasks DROP COLUMN items_to_deploy")) {
                    stmt.executeUpdate();
                    log.info("Dropped items_to_deploy column.");
                } catch (Exception e) {
                    // Ignore if it doesn't exist
                }
            } catch (Exception e) {
                log.warn("Could not complete Flyway cleanup strategy: {}", e.getMessage());
            }
            flyway.migrate();
        };
    }
}
