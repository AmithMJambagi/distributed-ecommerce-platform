package com.ecommerce.product_service.dto;

import java.time.ZonedDateTime;
import java.util.List;

import com.ecommerce.product_service.entity.*;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductResponseDto(@NotBlank(message = "ID is required") String id,

		@NotBlank(message = "Name is required") String name,

		String description,

		@NotBlank(message = "SKU is required") String sku,

		@Min(value = 0, message = "Price cannot be negative") long price,

		@NotNull(message = "Category ID is required") Long categoryId,

		@NotNull(message = "Status is required") Status status,

		String primaryImageUrl,

		List<String> galleryImages,

		ZonedDateTime createdAt) {
	public ProductResponseDto {
		galleryImages = (galleryImages == null) ? List.of() : List.copyOf(galleryImages);
	}

}