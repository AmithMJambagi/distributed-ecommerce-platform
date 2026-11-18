package com.ecommerce.product_service.service;



import org.springframework.stereotype.Component;

import com.ecommerce.product_service.dto.ProductRequestDto;
import com.ecommerce.product_service.dto.ProductResponseDto;
import com.ecommerce.product_service.entity.Product;

@Component
public class ProductTransformer {

	public ProductResponseDto productResponseBuilder(Product product) {
		if (product == null) {
			return null;
		}

		return new ProductResponseDto(product.getId(), product.getName(), product.getDescription(), product.getSku(),
				product.getPrice(), product.getCategoryId(), product.getStatus(), product.getPrimaryImageUrl(),
				product.getGalleryImages(), product.getCreatedAt());
	}

	public Product productRequestBuilder(ProductRequestDto productRequestDto) {
		if (productRequestDto == null) {
			return null;
		}

		Product product = new Product();
		product.setCategoryId(productRequestDto.getCategoryId());
		product.setDescription(productRequestDto.getDescription());
		product.setGalleryImages(productRequestDto.getGalleryImages());
		product.setName(productRequestDto.getName());
		product.setPrice(productRequestDto.getPrice());
		product.setPrimaryImageUrl(productRequestDto.getPrimaryImageUrl());
		product.setGalleryImages(productRequestDto.getGalleryImages());
		product.setStatus(productRequestDto.getStatus());
		product.setSku(productRequestDto.getSku());
		return product;

	}
	
	public Product updateProductEntity(Product existingProduct, ProductRequestDto dto) {
        existingProduct.setName(dto.getName());
        existingProduct.setDescription(dto.getDescription());
        existingProduct.setPrice(dto.getPrice());
        existingProduct.setCategoryId(dto.getCategoryId());
        existingProduct.setSku(dto.getSku());
        existingProduct.setStatus(dto.getStatus());
        existingProduct.setStatus(dto.getStatus());
        existingProduct.setPrimaryImageUrl(dto.getPrimaryImageUrl());
        existingProduct.setGalleryImages(dto.getGalleryImages());
        return existingProduct;
    }
}
