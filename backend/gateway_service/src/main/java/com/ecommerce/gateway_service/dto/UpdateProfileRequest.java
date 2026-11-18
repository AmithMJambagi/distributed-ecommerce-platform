package com.ecommerce.gateway_service.dto;

public record UpdateProfileRequest(
        String fullName,
        String phoneNumber,
        Integer age,
        String gender,
        String address
    ) {}
