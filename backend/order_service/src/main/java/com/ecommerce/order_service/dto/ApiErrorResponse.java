package com.ecommerce.order_service.dto;

public record ApiErrorResponse(
        boolean success,
        String message
    ) {}
