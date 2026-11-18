package com.ecommerce.order_service.dto;

public record InventoryResponseDto(
        String productId,
        String sku,
        Integer availableStock,
        boolean isInStock
    ) {}
