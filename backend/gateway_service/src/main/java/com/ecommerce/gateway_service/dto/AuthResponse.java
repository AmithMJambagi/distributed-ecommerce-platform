package com.ecommerce.gateway_service.dto;

public record AuthResponse(
        String token,
        UserSummary user
    ) {
        public record UserSummary(
            String id,
            String email,
            String fullName,
            String role
        ) {}
    }
