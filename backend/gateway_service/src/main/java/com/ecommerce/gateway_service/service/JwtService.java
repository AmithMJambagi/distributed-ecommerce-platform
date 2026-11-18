package com.ecommerce.gateway_service.service;

import com.ecommerce.gateway_service.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationSeconds;

    public JwtService(
            @Value("${security.jwt.secret}") String secret,
            @Value("${security.jwt.expiration-seconds:3600}") long expirationSeconds) {

        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationSeconds = expirationSeconds;
    }

    /**
     * Issues a signed JWT with expiration calculated from configurable seconds.
     */
    public String generateToken(User user) {
        Date now = new Date();
        // Convert configurable seconds to milliseconds for Date arithmetic
        Date expiryDate = new Date(now.getTime() + (expirationSeconds * 1000L));

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("email", user.getEmail());
        if (user.getUserDetail() != null) {
            claims.put("name", user.getUserDetail().getFullName());
        }

        return Jwts.builder()
                .subject(user.getId())       
                .claims(claims)              
                .issuedAt(now)
                .expiration(expiryDate)      
                .signWith(secretKey)         
                .compact();
    }

    /**
     * Cryptographically validates token signature and expiration without touching the DB.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token received: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Extracts payload claims from a validated token.
     */
    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts user ID (subject) to inject into downstream X-Customer-Id header.
     */
    public String extractUserId(String token) {
        return extractClaims(token).getSubject();
    }

    /**
     * Extracts user role to enforce RBAC (ROLE_ADMIN vs ROLE_USER).
     */
    public String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }
}
