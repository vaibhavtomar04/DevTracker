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

                        // Do not return index.html for API requests or static asset files (.js, .css, images, fonts)
                        if (resourcePath.startsWith("api/") || 
                            resourcePath.startsWith("assets/") || 
                            resourcePath.startsWith("static/") ||
                            isStaticAssetPath(resourcePath)) {
                            Resource superResource = super.getResource(resourcePath, location);
                            if (superResource != null && superResource.exists() && superResource.isReadable()) {
                                return superResource;
                            }
                            return null; // Let Spring try next resource location or return 404
                        }
                        
                        // Only fallback to index.html for non-asset SPA route navigations when checking classpath location
                        if (location.getURL().getProtocol().equals("jar") || location.getURL().getPath().contains("static")) {
                            return new ClassPathResource("/static/index.html");
                        }
                        
                        return super.getResource(resourcePath, location);
                    }
                });
    }

    private static boolean isStaticAssetPath(String path) {
        if (path == null) return false;
        String lower = path.toLowerCase();
        return lower.endsWith(".js") || lower.endsWith(".css") || lower.endsWith(".png") ||
               lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") ||
               lower.endsWith(".svg") || lower.endsWith(".ico") || lower.endsWith(".woff") ||
               lower.endsWith(".woff2") || lower.endsWith(".ttf") || lower.endsWith(".map") ||
               lower.endsWith(".json");
    }
}
