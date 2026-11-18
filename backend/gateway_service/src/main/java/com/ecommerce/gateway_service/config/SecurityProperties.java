package com.ecommerce.gateway_service.config;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "security")
@Getter
@Setter
public class SecurityProperties {

    private List<String> whitelist = new ArrayList<>();
    private List<String> publicReadPaths = new ArrayList<>();
    private List<AdminRouteConfig> adminPaths = new ArrayList<>();

    @Getter
    @Setter
    public static class AdminRouteConfig {
        private String path;
        private List<String> methods = new ArrayList<>();
    }
    
    @Getter
    @Setter
    public static class AdminRouteRule { 
        private String path;
        private List<String> methods = new ArrayList<>();
    }
}