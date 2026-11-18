package com.ecommerce.order_service.dto;

import java.io.Serializable;

public record CheckOutRequest(String shippingAddress) implements Serializable{

}
