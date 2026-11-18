package com.ecommerce.inventory_service.dto;

import java.io.Serializable;

public record InventoryResponseDto(String productId, String sku, Integer availableStock, boolean isInStock)
		implements Serializable {
}
