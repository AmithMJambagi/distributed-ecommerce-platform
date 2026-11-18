package com.ecommerce.gateway_service.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // 1. Allowed Origins: Allow any origin pattern (supports IP and domain with credentials)
        config.addAllowedOriginPattern("*");

        // 2. Allowed HTTP Methods
        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // 3. Allowed Headers (Wildcard allows Authorization, Content-Type, Idempotency-Key,etc.)
        config.setAllowedHeaders(List.of("*"));

        // 4. Exposed Headers (Allows React to read custom response headers)
        config.setExposedHeaders(Arrays.asList(
                "Authorization",
                "X-Customer-Id",
                "Idempotency-Key"
        ));

        // 5. Allow Credentials (Essential for Authorization headers and cookies)
        config.setAllowCredentials(true);

        // 6. Cache Preflight Response for 1 hour (Reduces unnecessary OPTIONS network calls)
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
