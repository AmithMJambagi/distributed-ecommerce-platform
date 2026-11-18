package com.ecommerce.product_service.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.product_service.dto.ProductRequestDto;
import com.ecommerce.product_service.dto.ProductResponseDto;
import com.ecommerce.product_service.dto.ResponseMessage;
import com.ecommerce.product_service.service.ProductService;

import jakarta.validation.Valid;

import java.util.*;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

	private final ProductService productService;

	public ProductController(ProductService productService) {
		this.productService = productService;
	}

	// this is the rest api that retrieves the product based on the id.
	@GetMapping("/{id}")
	public ResponseEntity<ProductResponseDto> getProductById(@PathVariable String id) {
		ProductResponseDto productDto = productService.getProductById(id);

		return ResponseEntity.ok(productDto);
	}

	// this is the rest api that retrieves the product based on category
	@GetMapping
	public ResponseEntity<Page<ProductResponseDto>> getProductListByCategory(
			@RequestParam(required = false) Long categoryId, @RequestParam(defaultValue = "0") Integer page,
			@RequestParam(defaultValue = "20") Integer size) {
		Page<ProductResponseDto> productList = productService.getProductListByCategory(categoryId, page, size);
		return ResponseEntity.status(HttpStatus.OK).body(productList);

	}

	// this is the api that does one db call to the db to fetch all the products
	// that needed in a batch by order or cart service
	@PostMapping("/batch")
	public ResponseEntity<List<ProductResponseDto>> getProductByBatch(@RequestBody List<String> productIds) {
		List<ProductResponseDto> productList = productService.getProductByBatch(productIds);

		return ResponseEntity.status(HttpStatus.OK).body(productList);
	}

	// this is the api that allows the admin to add products to the product service
	@PostMapping
	public ResponseEntity<ResponseMessage> addProduct(@Valid @RequestBody ProductRequestDto productRequestDto) {
		ResponseMessage message = productService.addProduct(productRequestDto);

		return ResponseEntity.status(HttpStatus.OK).body(message);
	}

	@PostMapping("/bulk")
	public ResponseEntity<ResponseMessage> addProducts(@RequestBody List<ProductRequestDto> productList) {
		ResponseMessage message = productService.addProducts(productList);

		return ResponseEntity.status(HttpStatus.OK).body(message);
	}
	
	@GetMapping("/all")
	public ResponseEntity<List<ProductResponseDto>> getAllProducts(){
		List<ProductResponseDto> response = productService.getAllProducts();
		
		return ResponseEntity.status(HttpStatus.OK).body(response);
	}
	
	//this is the method that will update the product
	@PutMapping("/{id}")
	public ResponseEntity<ProductResponseDto> updateProduct(@PathVariable String id, @RequestBody ProductRequestDto dto){
		
		ProductResponseDto productResponseDto = productService.updateProduct(id,dto);
		
		return ResponseEntity.status(HttpStatus.OK).body(productResponseDto);
	}
	
}
