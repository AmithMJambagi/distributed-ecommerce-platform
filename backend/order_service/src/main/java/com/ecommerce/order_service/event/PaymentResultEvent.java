package com.ecommerce.order_service.event;

public record PaymentResultEvent(String orderId , String status) {

}
