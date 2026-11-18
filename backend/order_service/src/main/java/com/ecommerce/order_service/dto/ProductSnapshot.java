package com.ecommerce.order_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ProductSnapshot(
        String id,
        String name,
        Long price,
        String primaryImageUrl,
        String status
    ) {}
