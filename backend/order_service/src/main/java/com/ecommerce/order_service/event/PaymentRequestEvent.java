package com.ecommerce.order_service.event;

import java.io.Serializable;

public record PaymentRequestEvent(String orderId, String customerId, Long totalAmount) implements Serializable{

}
