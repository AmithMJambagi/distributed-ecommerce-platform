package com.ecommerce.inventory_service.event;

import java.io.Serializable;

public record PaymentResultEvent(String orderId, String status) implements Serializable{

}
