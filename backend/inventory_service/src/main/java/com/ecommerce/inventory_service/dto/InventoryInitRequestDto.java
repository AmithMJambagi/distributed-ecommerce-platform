package com.ecommerce.inventory_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InventoryInitRequestDto(
    @NotBlank(message = "Product ID cannot be blank")
    String productId,

    @NotBlank(message = "SKU cannot be blank")
    String sku,

    @NotNull(message = "Total stock cannot be null")
    @Min(value = 0, message = "Total stock must be non-negative")
    Integer totalStock
) {}
