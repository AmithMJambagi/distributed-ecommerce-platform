package com.ecommerce.order_service.dto;

import java.io.Serializable;
import java.time.ZonedDateTime;

import com.ecommerce.order_service.entity.OrderStatus;

public record CheckOutResponse(String orderId, OrderStatus status , Long totalAmount ,String shippingAddress, ZonedDateTime createdAt) implements Serializable {

}
