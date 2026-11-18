package com.ecommerce.gateway_service.dto;

public record UserProfileResponse(
        String id,
        String email,
        String fullName,
        String phoneNumber,
        Integer age,
        String gender,
        String address,
        String role
    ) {}
