package com.devtrack.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class SpaWebFilter implements WebMvcConfigurer {

    @Autowired
    private PerformanceLoggingInterceptor performanceLoggingInterceptor;

    @Value("${devtrack.mail.logo-dir:}")
    private String externalLogoDir;

    @Value("${devtrack.mail.templates-dir:}")
    private String externalTemplatesDir;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Register performance interceptor for all /api/** paths
        registry.addInterceptor(performanceLoggingInterceptor)
                .addPathPatterns("/api/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        List<String> locations = new ArrayList<>();

        if (externalLogoDir != null && !externalLogoDir.isBlank()) {
            String dir = externalLogoDir.endsWith("/") || externalLogoDir.endsWith("\\") ? externalLogoDir : externalLogoDir + "/";
            locations.add("file:" + dir);
        }
        if (externalTemplatesDir != null && !externalTemplatesDir.isBlank()) {
            String dir = externalTemplatesDir.endsWith("/") || externalTemplatesDir.endsWith("\\") ? externalTemplatesDir : externalTemplatesDir + "/";
            locations.add("file:" + dir);
        }
        locations.add("classpath:/static/");

        registry.addResourceHandler("/**")
                .addResourceLocations(locations.toArray(new String[0]))
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }
                        
                        if (resourcePath.startsWith("api/")) {
                            return null; // Let the API controllers handle it
                        }
                        
                        // Route all other unknown requests (like React Router paths) to index.html
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
