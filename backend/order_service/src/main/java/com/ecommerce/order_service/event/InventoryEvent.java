package com.ecommerce.order_service.event;

import java.io.Serializable;

public record InventoryEvent(String orderId, String status) implements Serializable {

}
