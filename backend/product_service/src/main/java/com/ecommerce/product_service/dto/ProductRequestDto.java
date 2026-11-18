package com.ecommerce.product_service.dto;

import java.util.List;

import com.ecommerce.product_service.entity.Status;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequestDto {
	@NotBlank(message = "Description is required")
	@Size(min = 10, max = 4000, message = "Description must be between 10 and 4000 characters")
	private String description;

	@NotBlank(message = "SKU code is required")
	private String sku;

	@NotBlank(message = "Name is required")
	private String name;

	@Min(value = 0, message = "Price cannot be negative")
	private long price;

	@Min(value = 1, message = "Valid Category ID is required")
	private long categoryId;

	@NotNull(message = "Product status is required")
	private Status status;

	@NotBlank(message = "Primary image URL is required")
	private String primaryImageUrl;

	@NotEmpty(message = "At least one gallery image is required")
	private List<String> galleryImages;

}
