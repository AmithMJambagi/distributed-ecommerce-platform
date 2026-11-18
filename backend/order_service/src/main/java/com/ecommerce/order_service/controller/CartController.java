package com.ecommerce.order_service.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.order_service.dto.*;
import com.ecommerce.order_service.service.CartService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {
	private final CartService cartService;

	public CartController(CartService cartService) {
		this.cartService = cartService;
	}

	@PostMapping("/items")
	public ResponseEntity<Map<String, Object>> addCartItem(@RequestHeader("X-Customer-Id") String customerId,
			@Valid @RequestBody CartItemRequest request) {

		Long updatedQuantity = cartService.addCartItem(customerId, request);

		return ResponseEntity.ok(Map.of("productId", request.productId(), "quantity", updatedQuantity, "message",
				"Item added to cart successfully"));
	}
	
	@PutMapping("/items")
	public ResponseEntity<Map<String, String>> updateCartItem(@RequestHeader("X-Customer-Id") String customerId,
			@Valid @RequestBody CartItemRequest request) {
		cartService.updateCartItemQuantity(customerId, request);
		return ResponseEntity.ok(Map.of("message", "Cart item updated successfully"));
	}
	
	@DeleteMapping("/items/{productId}")
    public ResponseEntity<Map<String, String>> removeCartItem(
            @RequestHeader("X-Customer-Id") String customerId,
            @PathVariable String productId) {
        cartService.removeCartItem(customerId, productId);
        return ResponseEntity.ok(Map.of("message", "Item removed from cart"));
    }
	
	 @GetMapping
     public ResponseEntity<CartResponseDto> getCart(
             @RequestHeader("X-Customer-Id") String customerId) throws JsonMappingException, JsonProcessingException {
         CartResponseDto cart = cartService.getCart(customerId);
         return ResponseEntity.ok(cart);
     }
}