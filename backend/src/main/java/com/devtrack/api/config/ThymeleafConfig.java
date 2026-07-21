package com.devtrack.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.FileTemplateResolver;
import org.thymeleaf.templateresolver.ITemplateResolver;

/**
 * Thymeleaf configuration that supports hot-reloadable email templates.
 *
 * <p>When {@code devtrack.mail.templates-dir} is set (e.g. via the
 * {@code MAIL_TEMPLATES_DIR} environment variable), a {@link FileTemplateResolver}
 * is registered at order=1 with caching disabled. Thymeleaf will resolve templates
 * from that directory first, so you can edit {@code .html} files on disk and the
 * next email send will use the updated version — no restart required.</p>
 *
 * <p>If the external directory is not configured, or the requested template is not
 * found there, Thymeleaf falls through to the bundled classpath templates at order=2
 * (the application's {@code src/main/resources/templates/} directory).</p>
 *
 * <h3>Quick-start</h3>
 * <pre>
 *   # 1. Set the environment variable pointing to your templates root:
 *   export MAIL_TEMPLATES_DIR=/opt/devtrack/templates
 *
 *   # 2. Copy the template(s) you want to customise:
 *   mkdir -p /opt/devtrack/templates/email
 *   cp bug-notification.html /opt/devtrack/templates/email/
 *
 *   # 3. Edit the file — no restart needed.
 * </pre>
 */
@Configuration
public class ThymeleafConfig {

    /** Absolute path to the external templates root directory, e.g. {@code /opt/devtrack/templates}. */
    @Value("${devtrack.mail.templates-dir:}")
    private String externalTemplatesDir;

    /**
     * Configures the {@link SpringTemplateEngine} with a two-level resolver chain:
     * <ol>
     *   <li>External filesystem resolver (order=1, cache disabled) — only registered
     *       when {@code devtrack.mail.templates-dir} is non-blank.</li>
     *   <li>Classpath resolver (order=2) — always present as a safe fallback.</li>
     * </ol>
     */
    @Bean
    public SpringTemplateEngine templateEngine() {
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setEnableSpringELCompiler(true);

        // ── Order 1: external filesystem resolver (hot-reload) ──────────────────
        if (externalTemplatesDir != null && !externalTemplatesDir.isBlank()) {
            engine.addTemplateResolver(fileTemplateResolver());
        }

        // ── Order 2: bundled classpath resolver (fallback) ──────────────────────
        engine.addTemplateResolver(classpathTemplateResolver());

        return engine;
    }

    /**
     * Filesystem-based resolver that reads templates from the configured external
     * directory. Caching is disabled so file edits are picked up immediately.
     */
    private ITemplateResolver fileTemplateResolver() {
        // Normalise the directory path — ensure it ends with a separator
        String prefix = externalTemplatesDir.endsWith("/") || externalTemplatesDir.endsWith("\\")
                ? externalTemplatesDir
                : externalTemplatesDir + "/";

        FileTemplateResolver resolver = new FileTemplateResolver();
        resolver.setOrder(1);
        resolver.setPrefix(prefix);
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);          // ← key: no cache = hot-reload
        resolver.setCheckExistence(true);      // fall-through to next resolver if missing
        return resolver;
    }

    /**
     * Classpath-based resolver that serves the bundled templates packaged inside
     * the JAR. Acts as a guaranteed fallback when an external template is absent.
     */
    private ITemplateResolver classpathTemplateResolver() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setOrder(2);
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(true);
        resolver.setCheckExistence(true);
        return resolver;
    }
}
