package com.ecommerce.order_service.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.order_service.dto.BuyNowRequest;
import com.ecommerce.order_service.dto.CheckOutRequest;
import com.ecommerce.order_service.dto.CheckOutResponse;
import com.ecommerce.order_service.dto.OrderHistoryResponse;
import com.ecommerce.order_service.service.OrderService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
	
	private final OrderService orderService;
	
	public OrderController(OrderService orderService) {
		this.orderService = orderService;
	}
	
	

    @PostMapping
    public ResponseEntity<CheckOutResponse> checkOutCart(
            @RequestHeader("X-Customer-Id") String customerId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody(required = false) CheckOutRequest request) throws JsonMappingException,
  JsonProcessingException {

        String shippingAddress = (request != null) ? request.shippingAddress() : null;
        CheckOutResponse checkOutResponse = orderService.checkOutCart(customerId, idempotencyKey,
  shippingAddress);

        return ResponseEntity.status(HttpStatus.CREATED).body(checkOutResponse);
    }
	
	@PostMapping("/buy-now")
	public ResponseEntity<CheckOutResponse> checkoutBuyNow(@RequestHeader ("X-Customer-Id") String customerId,  @RequestHeader(value="Idempotency-Key" , required=false) String idempotencyKey, @Valid @RequestBody BuyNowRequest request) throws JsonMappingException, JsonProcessingException {
		
		CheckOutResponse checkOutResponse = orderService.checkOutBuyNow(customerId,idempotencyKey,request);
		
		return ResponseEntity.status(HttpStatus.CREATED).body(checkOutResponse);
	}
	
	  @GetMapping
      public ResponseEntity<List<OrderHistoryResponse>> getCustomerOrders(
              @RequestHeader("X-Customer-Id") String customerId) {
          return ResponseEntity.ok(orderService.getCustomerOrders(customerId));
      }
}
