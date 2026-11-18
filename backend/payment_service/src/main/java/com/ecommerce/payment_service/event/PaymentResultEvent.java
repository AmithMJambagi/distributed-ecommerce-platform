package com.ecommerce.payment_service.event;

import java.io.Serializable;

public record PaymentResultEvent(String orderId,String status) implements Serializable {

}
