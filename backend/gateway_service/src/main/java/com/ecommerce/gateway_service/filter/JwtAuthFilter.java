package com.ecommerce.gateway_service.filter;
import com.ecommerce.gateway_service.config.SecurityProperties;
import com.ecommerce.gateway_service.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Component
@Order(1) // Executes at the perimeter, immediately after CORS validation
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String HEADER_CUSTOMER_ID = "X-Customer-Id";
    private static final String HEADER_USER_ROLES = "X-User-Roles";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final JwtService jwtService;
    private final SecurityProperties securityProperties;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthFilter(JwtService jwtService, SecurityProperties securityProperties) {
        this.jwtService = jwtService;
        this.securityProperties = securityProperties;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        //  Unconditionally allow browser preflight CORS OPTIONS requests
        if (HttpMethod.OPTIONS.matches(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        //  Allow whitelisted public endpoints defined in application.yml
        if (isWhitelisted(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        //  Allow public GET read-only endpoints defined in application.yml
        if (HttpMethod.GET.matches(method) && isPublicReadPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Token Extraction & Validation on all protected endpoints
        String authHeader = request.getHeader(HEADER_AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
            return;
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();
        if (!jwtService.validateToken(token)) {
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, "Token is expired or invalid");
            return;
        }

        //  Extract verified identity claims in-memory 
        String userId = jwtService.extractUserId(token);
        String role = jwtService.extractRole(token);

        // 6. Role-Based Access Control (Admin route verification)
        if (isAdminRoute(method, path) && !ROLE_ADMIN.equalsIgnoreCase(role)) {
            log.warn("Access Denied: User {} with role '{}' attempted admin operation: {} {}",
                    userId, role, method, path);
            sendErrorResponse(response, HttpStatus.FORBIDDEN, "Access denied: Administrator privleges required");
            return;
        }

        // 7. Identity Propagation & Header Sanitization
        // Wraps the request: strips untrusted client headers and injects verified ones
        HeaderModifierRequestWrapper requestWrapper = new HeaderModifierRequestWrapper(request);
        requestWrapper.addHeader(HEADER_CUSTOMER_ID, userId);
        requestWrapper.addHeader(HEADER_USER_ROLES, role);

        log.debug(">> [GATEWAY SECURE PASS] Path: {} | Injected {}: {} | Injected {}: {}",
                path, HEADER_CUSTOMER_ID, userId, HEADER_USER_ROLES, role);

        filterChain.doFilter(requestWrapper, response);
    }

    private boolean isWhitelisted(String path) {
        if (securityProperties.getWhitelist() == null) return false;
        for (String pattern : securityProperties.getWhitelist()) {
            if (pathMatcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private boolean isPublicReadPath(String path) {
        if (securityProperties.getPublicReadPaths() == null) return false;
        for (String pattern : securityProperties.getPublicReadPaths()) {
            if (pathMatcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private boolean isAdminRoute(String method, String path) {
        if (securityProperties.getAdminPaths() == null) return false;
        for (SecurityProperties.AdminRouteConfig rule : securityProperties.getAdminPaths()) {
            if (pathMatcher.match(rule.getPath(), path)) {
                if (rule.getMethods() != null && rule.getMethods().stream().anyMatch(m -> m.
equalsIgnoreCase(method))) {
                    return true;
                }
            }
        }
        return false;
    }

    private void sendErrorResponse(HttpServletResponse response, HttpStatus status, String
message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        String json = String.format(
                "{\"timestamp\":%d,\"status\":%d,\"error\":\"%s\",\"message\":\"%s\"}",
                System.currentTimeMillis(), status.value(), status.getReasonPhrase(), message
        );
        response.getWriter().write(json);
    }

    /**
     * Request wrapper that transparently overrides and injects verified headers
     * for downstream microservices.
     */
    private static class HeaderModifierRequestWrapper extends HttpServletRequestWrapper {
        private final Map<String, String> customHeaders = new HashMap<>();

        public HeaderModifierRequestWrapper(HttpServletRequest request) {
            super(request);
        }

        public void addHeader(String name, String value) {
            this.customHeaders.put(name.toLowerCase(), value);
        }

        @Override
        public String getHeader(String name) {
            String custom = customHeaders.get(name.toLowerCase());
            return (custom != null) ? custom : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            Set<String> set = new HashSet<>(customHeaders.keySet());
            Enumeration<String> base = super.getHeaderNames();
            while (base.hasMoreElements()) {
                set.add(base.nextElement().toLowerCase());
            }
            return Collections.enumeration(set);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            String custom = customHeaders.get(name.toLowerCase());
            if (custom != null) {
                return Collections.enumeration(Collections.singletonList(custom));
            }
            return super.getHeaders(name);
        }
    }
}
