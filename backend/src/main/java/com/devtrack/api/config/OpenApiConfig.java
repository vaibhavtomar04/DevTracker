package com.devtrack.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Enterprise OpenAPI 3 / Swagger Specification Configuration.
 * Configures global Bearer JWT security schemes and groups endpoints into functional domain tags.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI devTrackOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("DevTrack 2.0 REST API")
                        .description("Enterprise Change Request tracking, sprint management, code review, and document storage backend.")
                        .version("2.0.0")
                        .contact(new Contact().name("DevTrack Engineering").email("support@devtrack.com"))
                        .license(new License().name("Proprietary").url("https://devtrack.com")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter JWT Bearer token received from /api/auth/signin")))
                .tags(List.of(
                        new Tag().name("Authentication").description("Login, JWT tokens, password reset, and Entra ID OAuth2"),
                        new Tag().name("CR").description("Change Request tasks, workflow steps, and transition management"),
                        new Tag().name("Sprint").description("Sprint board management, burndown metrics, and velocity tracking"),
                        new Tag().name("Bug").description("Bug tracking, reproduction steps, and resolution workflow"),
                        new Tag().name("Notifications").description("Real-time WebSocket and polling notification endpoints"),
                        new Tag().name("User Management").description("Admin user creation, role assignment, and user administration"),
                        new Tag().name("Reports").description("Asynchronous report generation and export APIs"),
                        new Tag().name("Documents").description("Binary file uploads, stream downloads, and versioning"),
                        new Tag().name("Audit").description("Grouped audit logs and entity transition timeline history"),
                        new Tag().name("Analytics").description("Operational throughput, SLA, and bug validation metrics dashboards")
                ));
    }
}
