package com.devtrack.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.IEngineConfiguration;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.FileTemplateResolver;
import org.thymeleaf.templateresolver.ITemplateResolver;
import org.thymeleaf.templateresolver.TemplateResolution;

import java.io.File;
import java.util.Map;

/**
 * Thymeleaf configuration that supports hot-reloadable external email templates.
 *
 * <p>When {@code devtrack.mail.templates-dir} is set (via environment variable
 * {@code MAIL_TEMPLATES_DIR} or application.properties default), filesystem
 * resolvers are registered with caching disabled. Edits on disk are picked up
 * immediately on the next email send without application restart.</p>
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
            engine.addTemplateResolver(new DirectFileTemplateResolver(externalTemplatesDir, 1));

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

    /**
     * Delegating ITemplateResolver that strips "email/" prefix from requested template names
     * to resolve files placed directly inside externalTemplatesDir.
     */
    private static class DirectFileTemplateResolver implements ITemplateResolver {
        private final FileTemplateResolver delegate;

        public DirectFileTemplateResolver(String externalTemplatesDir, int order) {
            String prefix = externalTemplatesDir.endsWith("/") || externalTemplatesDir.endsWith("\\")
                    ? externalTemplatesDir
                    : externalTemplatesDir + "/";

            this.delegate = new FileTemplateResolver();
            this.delegate.setOrder(order);
            this.delegate.setPrefix(prefix);
            this.delegate.setSuffix(".html");
            this.delegate.setTemplateMode("HTML");
            this.delegate.setCharacterEncoding("UTF-8");
            this.delegate.setCacheable(false);
            this.delegate.setCheckExistence(true);
        }

        @Override
        public String getName() {
            return "DirectFileTemplateResolver";
        }

        @Override
        public Integer getOrder() {
            return delegate.getOrder();
        }

        @Override
        public TemplateResolution resolveTemplate(IEngineConfiguration configuration, String ownerTemplate, String template, Map<String, Object> templateResolutionAttributes) {
            String cleanTemplateName = template;
            if (cleanTemplateName != null && cleanTemplateName.startsWith("email/")) {
                cleanTemplateName = cleanTemplateName.substring(6);
            } else if (cleanTemplateName != null && cleanTemplateName.startsWith("email\\")) {
                cleanTemplateName = cleanTemplateName.substring(6);
            }
            return delegate.resolveTemplate(configuration, ownerTemplate, cleanTemplateName, templateResolutionAttributes);
        }
    }
}
