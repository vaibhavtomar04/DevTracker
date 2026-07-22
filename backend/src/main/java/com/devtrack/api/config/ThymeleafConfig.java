package com.devtrack.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.FileTemplateResolver;
import org.thymeleaf.templateresolver.ITemplateResolver;

import java.io.File;

/**
 * Thymeleaf configuration that supports hot-reloadable external email templates.
 *
 * <p>When {@code devtrack.mail.templates-dir} is set (via environment variable
 * {@code MAIL_TEMPLATES_DIR} or application.properties default), filesystem
 * resolvers are registered with caching disabled. Edits on disk are picked up
 * immediately on the next email send without application restart.</p>
 *
 * <p>Resolver Chain:
 * <ol>
 *   <li><b>Direct File Resolver (Order 1)</b>: Resolves templates placed directly inside
 *       the external directory (e.g. {@code /EmailTemplates/bug-notification.html})
 *       even when code requests {@code "email/bug-notification"}.</li>
 *   <li><b>Nested File Resolver (Order 2)</b>: Resolves templates placed inside a subfolder
 *       (e.g. {@code /EmailTemplates/email/bug-notification.html}).</li>
 *   <li><b>Classpath Resolver (Order 3)</b>: Fallback bundled JAR templates.</li>
 * </ol>
 * </p>
 */
@Configuration
@Slf4j
public class ThymeleafConfig {

    @Value("${devtrack.mail.templates-dir:}")
    private String externalTemplatesDir;

    @Bean
    public SpringTemplateEngine templateEngine() {
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setEnableSpringELCompiler(true);

        if (externalTemplatesDir != null && !externalTemplatesDir.isBlank()) {
            File dir = new File(externalTemplatesDir);
            log.info("Configuring external email templates directory: {} (exists: {})", 
                    externalTemplatesDir, dir.exists());

            // Order 1: Direct file resolver (strips "email/" prefix if files are directly in EmailTemplates/)
            engine.addTemplateResolver(directFileTemplateResolver());

            // Order 2: Nested file resolver (retains "email/" subfolder if files are in EmailTemplates/email/)
            engine.addTemplateResolver(nestedFileTemplateResolver());
        } else {
            log.info("No external email template directory configured; using bundled classpath templates.");
        }

        // Order 3: Classpath resolver (fallback inside JAR)
        engine.addTemplateResolver(classpathTemplateResolver());

        return engine;
    }

    /**
     * Resolves templates directly under externalTemplatesDir (e.g. /EmailTemplates/bug-notification.html)
     * when requested name is "email/bug-notification".
     */
    private ITemplateResolver directFileTemplateResolver() {
        String prefix = externalTemplatesDir.endsWith("/") || externalTemplatesDir.endsWith("\\")
                ? externalTemplatesDir
                : externalTemplatesDir + "/";

        FileTemplateResolver resolver = new FileTemplateResolver() {
            @Override
            protected String computePatternReplacedTemplateName(String templateName) {
                String name = templateName;
                if (name != null && name.startsWith("email/")) {
                    name = name.substring(6);
                } else if (name != null && name.startsWith("email\\")) {
                    name = name.substring(6);
                }
                return super.computePatternReplacedTemplateName(name);
            }
        };

        resolver.setOrder(1);
        resolver.setPrefix(prefix);
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);     // Hot-reload: no cache
        resolver.setCheckExistence(true); // Fall through to next resolver if file not on disk
        return resolver;
    }

    /**
     * Resolves templates under externalTemplatesDir/email/ (e.g. /EmailTemplates/email/bug-notification.html).
     */
    private ITemplateResolver nestedFileTemplateResolver() {
        String prefix = externalTemplatesDir.endsWith("/") || externalTemplatesDir.endsWith("\\")
                ? externalTemplatesDir
                : externalTemplatesDir + "/";

        FileTemplateResolver resolver = new FileTemplateResolver();
        resolver.setOrder(2);
        resolver.setPrefix(prefix);
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);
        resolver.setCheckExistence(true);
        return resolver;
    }

    /**
     * Fallback classpath resolver (Order 3).
     */
    private ITemplateResolver classpathTemplateResolver() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setOrder(3);
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(true);
        resolver.setCheckExistence(true);
        return resolver;
    }
}
