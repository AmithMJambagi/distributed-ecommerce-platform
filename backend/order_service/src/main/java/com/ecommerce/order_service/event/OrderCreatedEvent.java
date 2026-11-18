package com.ecommerce.order_service.event;

import java.io.Serializable;
import java.util.List;


public record OrderCreatedEvent(
	    String orderId,
	    String customerId,
	    Long totalAmount,
	    List<OrderItemPayload> items
	) implements Serializable {

	    public record OrderItemPayload(
	        String productId,
	        Integer quantity,
	        Long unitPrice
	    ) implements Serializable {}
	}

