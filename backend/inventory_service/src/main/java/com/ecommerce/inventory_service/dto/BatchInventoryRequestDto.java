package com.ecommerce.inventory_service.dto;
import java.util.List;
public record BatchInventoryRequestDto(
        List<String> productIds
    ) {}
