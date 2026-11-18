package com.ecommerce.order_service.dto;

import java.time.ZonedDateTime;
import java.util.List;
import com.ecommerce.order_service.entity.OrderStatus;

public record OrderHistoryResponse(
        String orderId,
        OrderStatus status,
        Long totalAmount,
        String shippingAddress,
        ZonedDateTime createdAt,
        List<OrderItemDto> items
    ) {
        public record OrderItemDto(
            String productId,
            String productName,        
            String primaryImageUrl,   
            Integer quantity,
            Long unitPrice,
            Long subtotal
        ) {}
    }