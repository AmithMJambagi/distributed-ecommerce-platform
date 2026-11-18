package com.ecommerce.payment_service.dto;

public record PaymentDetailsResponse(
        String orderId,
        String paymentUrl,
        Long amount,
        String status
    ) {}
