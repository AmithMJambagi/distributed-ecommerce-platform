package com.ecommerce.gateway_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendOtpRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,
    String type
) {
    public SendOtpRequest(String email) {
        this(email, "login");
    }
}
