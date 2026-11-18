package com.ecommerce.order_service.dto;

import java.util.List;

public record CartResponseDto(
        String customerId,
        List<CartItemDetail> items,
        Long totalAmount
    ) {
        public record CartItemDetail(
            String productId,
            String productName,
            String primaryImageUrl,
            Integer quantity,
            Long unitPrice,
            Long subtotal
        ) {}
    }
