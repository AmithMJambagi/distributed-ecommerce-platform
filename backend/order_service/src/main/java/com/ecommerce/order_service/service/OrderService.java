package com.ecommerce.order_service.service;


import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.ParameterizedTypeReference;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.ecommerce.order_service.dto.BuyNowRequest;
import com.ecommerce.order_service.dto.CartResponseDto;
import com.ecommerce.order_service.dto.CheckOutResponse;
import com.ecommerce.order_service.dto.InventoryResponseDto;
import com.ecommerce.order_service.dto.OrderHistoryResponse;
import com.ecommerce.order_service.dto.ProductSnapshot;
import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.entity.OrderItem;
import com.ecommerce.order_service.entity.OrderStatus;
import com.ecommerce.order_service.event.OrderCreatedEvent;

import com.ecommerce.order_service.event.PaymentRequestEvent;
import com.ecommerce.order_service.exception.EmptyCartException;
import com.ecommerce.order_service.exception.ProductNotFoundException;
import com.ecommerce.order_service.repository.OrderRepostiory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;


import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OrderService {
	
	private  OrderRepostiory orderRepository;
	private final RedisTemplate<String, Object> redisTemplate;
	private final ObjectMapper orderHistoryMapper = new ObjectMapper();
	private final CartService cartService;
	private final KafkaTemplate<String, Object> kafkaTemplate;
	private final String PAYMENT_REQUEST_TOPIC = "payment-requests";
	private final RestClient productRestClient;
	private final RestClient inventoryRestClient;
	public OrderService (OrderRepostiory orderRepository ,RestClient.Builder restClientBuilder, RedisTemplate< String, Object> redisTemplate, CartService cartService , KafkaTemplate<String, Object> kafkaTemplate, @Value("${services.product-service.url}") String productServiceUrl
						, @Value("${services.inventory-service.url}") String inventoryServiceClient) {
		this.orderRepository=orderRepository;
		this.redisTemplate=redisTemplate;
		
		this.cartService=cartService;
		this.kafkaTemplate=kafkaTemplate;
		 // Configure resilient timeouts on the request factory
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(2000));
        requestFactory.setReadTimeout(Duration.ofMillis(3000));

		 this.productRestClient = restClientBuilder
	                .baseUrl(productServiceUrl)
	                .requestFactory(requestFactory)
	                .build();
		 this.inventoryRestClient=restClientBuilder
				 .baseUrl(inventoryServiceClient)
				 .requestFactory(requestFactory)
				 .build();
	}
	
	private static final String ORDER_TOPIC = "order-events";
	//this is the checkout method that allows the user to checkout with their current cart to do onshot payment for all the products in the cart
	
	@Transactional
	public CheckOutResponse checkOutCart(String customerId, String idempotencyKey , String shippingAddress) throws JsonMappingException, JsonProcessingException {
		// TODO Auto-generated method stub
		// 1. Idempotency Guard: prevent duplicate orders on retry/double-click
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Order> existingOrder = orderRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOrder.isPresent()) {
                Order order = existingOrder.get();
                return new CheckOutResponse(
                    order.getOrderId(),
                    order.getStatus(),
                    order.getTotalAmount(),
                    order.getShippingAddress(),
                    order.getCreatedAt()
                );
            }
        }
		//get the whole cart details to build the checkout response 
		CartResponseDto cart = cartService.getCart(customerId);
		
		  if (cart == null || cart.items() == null || cart.items().isEmpty()) {
	            throw new EmptyCartException("Cannot checkout with an empty cart");
	        }
		
		String orderId = generateOrderId();
		Long totalAmount = cart.totalAmount();
		
		 Order order = Order.createNewOrder(orderId, customerId, totalAmount, idempotencyKey,shippingAddress);
		List<OrderCreatedEvent.OrderItemPayload> eventItems = new ArrayList<>();
		List<CartResponseDto.CartItemDetail> cartItems = cart.items();
		//adding the items to cart and calculation of the total cart price
		for(CartResponseDto.CartItemDetail item : cartItems) {
			 OrderItem orderItem = OrderItem.createOrderItem(
		                order,
		                item.productId(),
		                item.quantity(),
		                item.unitPrice()
		            );
			 
			 order.addItem(orderItem);
			 
			eventItems.add(new OrderCreatedEvent.OrderItemPayload(
	                item.productId(),
	                item.quantity(),
	                item.unitPrice()
	            ));
		}
		
		//saving the order to db
		 Order savedOrder = orderRepository.save(order);
		
		OrderCreatedEvent event = new OrderCreatedEvent(orderId,customerId,totalAmount,eventItems);
		
		
		kafkaTemplate.send(ORDER_TOPIC,orderId,event);
		
		 return new CheckOutResponse(
		            savedOrder.getOrderId(),
		            savedOrder.getStatus(),
		            savedOrder.getTotalAmount(),
		            savedOrder.getShippingAddress(),
		            savedOrder.getCreatedAt()
		        );
	}
	 private String generateOrderId() {
	        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
	        int randomPart = ThreadLocalRandom.current().nextInt(100_000, 1_000_000);
	        return "ORD-" + datePart + "-" + randomPart;
	    }
	 
	 //this is the service method to process the inventory result and then handle the payment request
	 public void processInventoryResult(String orderId, String status) {
		// TODO Auto-generated method stub
		
		 Order order = orderRepository.findById(orderId).orElse(null);
		 
		 if(order==null) {
			 log.warn("Order not found for orderId: {}",orderId);
			 return ;
		 }
		 //checking if the status is in valid state to change the status according to the event
		  if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.
				  CANCELLED) {
				        log.info("Order {} is already finalized in status {}, ignoring event {}",
				                 orderId, order.getStatus(), status);
				        return;
				    }

		 
		 if ("RESERVED".equalsIgnoreCase(status)) {
	            order.markInventoryReserved();
	            orderRepository.save(order);

	            //  Dispatch to Payment Service
	            PaymentRequestEvent paymentRequest = new PaymentRequestEvent(
	                order.getOrderId(),
	                order.getCustomerId(),
	                order.getTotalAmount()
	            );
	            kafkaTemplate.send(PAYMENT_REQUEST_TOPIC, order.getOrderId(), paymentRequest);
	            log.info(">>> Order {} marked INVENTORY_RESERVED. Dispatched to '{}'", orderId,PAYMENT_REQUEST_TOPIC);

	        } else if ("OUT_OF_STOCK".equalsIgnoreCase(status)) {
	            order.markFailedOutOfStock();
	            orderRepository.save(order);
	            log.warn(">>> Order {} marked FAILED_OUT_OF_STOCK", orderId);

	        } else if ("HOLD_EXPIRED".equalsIgnoreCase(status)) {
	            order.markCancelled();
	            orderRepository.save(order);
	            log.warn(">>> Order {} hold expired, marked CANCELLED", orderId);

	        } else {
	            log.warn("Unrecognized inventory status '{}' for order {}", status, orderId);
	        }
	 }
	 
		public void clearCart(String customerId) {
			String cartKey = "cart:" + customerId;
			redisTemplate.delete(cartKey);
			log.info("Cleared Redis cart for customer: {}", customerId);
		}
		
		//this is the method to process the payment events
		@Transactional
		public void processPaymentEvent(String orderId, String status) {
			// TODO Auto-generated method stub

			Order order = orderRepository.findById(orderId).orElse(null);

			if (order == null) {
				log.warn("Order not found for orderId: {}", orderId);
				return;
			}

			// Idempotency guard if already confirmed or cancelled
			if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.CANCELLED) {
				log.info("Order {} is already finalized with status {}, ignoring payment result", orderId,
						order.getStatus());
				return;
			}

			// handle payment outcome

			if ("SUCCESS".equalsIgnoreCase(status)) {
				order.markConfirmed();
				orderRepository.save(order);

				// clear customer cart in redis
				clearCart(order.getCustomerId());
				 log.info(">>> [ORDER CONFIRMED] OrderId: {} successfully paid and confirmed! Cart cleared for customer {}",
						                     orderId, order.getCustomerId());
			}else if ("FAILED".equalsIgnoreCase(status)) {
	            order.markCancelled();
	            orderRepository.save(order);
	            log.warn(">>> [ORDER CANCELLED] Payment failed for OrderId: {}", orderId);
	        } else {
	            log.warn("Unrecognized payment status '{}' for order {}", status, orderId);
	        }
		}
		
		//this is the method to checkout the buy now immediate buying of the product
		@Transactional
		public CheckOutResponse checkOutBuyNow(String customerId, String idempotencyKey, BuyNowRequest request) throws JsonProcessingException {
			// TODO Auto-generated method stub
			
			if(idempotencyKey !=null && !idempotencyKey.isBlank()) {
				Optional<Order> existingOrder = orderRepository.findByIdempotencyKey(idempotencyKey);
				 if (existingOrder.isPresent()) {
		                Order order = existingOrder.get();
		                return new CheckOutResponse(
		                    order.getOrderId(), order.getStatus(), order.getTotalAmount(),order.getShippingAddress(), order.getCreatedAt()
		                );
		            }
			}
			
			//Fetch the product price from redis or product service
			ProductSnapshot product = fetchProductSnapshot(request.productId());
			if (product == null) {
				throw new ProductNotFoundException("Product not found: " + request.productId());
			}
			InventoryResponseDto inventory = fetchInventory(request.productId());
		    if (inventory == null || !inventory.isInStock() || inventory.availableStock() == null || inventory.availableStock() < request.quantity()) {
		        throw new IllegalStateException("Product is out of stock or insufficient quantity available");
		    }
			//compute total & create order
			String orderId = generateOrderId();
			Long totalAmount = product.price() * request.quantity();
			
			Order order = Order.createNewOrder(orderId, customerId, totalAmount, idempotencyKey,request.shippingAddress());
			OrderItem orderItem = OrderItem.createOrderItem(order, request.productId(), request.quantity(), product.price());
			
			order.addItem(orderItem);
			
			//save to the postgres sql
			Order savedOrder = orderRepository.save(order);
			
			//publish to order-events
			OrderCreatedEvent.OrderItemPayload itemPayload = new OrderCreatedEvent.OrderItemPayload(request.productId(),request.quantity(),product.price());
			OrderCreatedEvent event = new OrderCreatedEvent(orderId,customerId,totalAmount,List.of(itemPayload));
			
			kafkaTemplate.send(ORDER_TOPIC,orderId,event);
			   return new CheckOutResponse(
			            savedOrder.getOrderId(),
			            savedOrder.getStatus(),
			            savedOrder.getTotalAmount(),
			            savedOrder.getShippingAddress(),
			            savedOrder.getCreatedAt()
			        );
		}
		
		//this is the helper method for fetching the product snapshot
		private ProductSnapshot fetchProductSnapshot(String productId) {
			 return productRestClient.get()
		                .uri("/api/v1/products/{id}", productId)
		                .retrieve()
		                .body(ProductSnapshot.class);
		}
		
		//this is the helper method to fetch the inventory for the productId
		 private InventoryResponseDto fetchInventory(String productId) {
		        try {
		            return inventoryRestClient.get()
		                    .uri("/api/v1/inventory/internal/{productId}", productId)
		                    .retrieve()
		                    .body(InventoryResponseDto.class);
		        } catch (Exception e) {
		            log.warn("Failed to reach inventory service for productId: {}", productId, e);
		            return null;
		        }
		    }
		 
		 
		 //this is a batch productsnap short for the history of orders
		 private Map<String, ProductSnapshot> fetchProductSnapshotsForOrders(List<String> productIds) {
			 if (productIds == null || productIds.isEmpty()) {
		            return Map.of();
		        }

		        Map<String, ProductSnapshot> resultMap = new HashMap<>();
		        List<String> redisKeys = productIds.stream().map(id -> "product:" + id).toList();
		        List<Object> cachedValues = redisTemplate.opsForValue().multiGet(redisKeys);

		        List<String> missedIds = new ArrayList<>();

		        //  Read hits from Redis as
		        for (int i = 0; i < productIds.size(); i++) {
		            String pId = productIds.get(i);
		            Object cached = (cachedValues != null) ? cachedValues.get(i) : null;

		            if (cached != null) {
		                try {
		                    ProductSnapshot snapshot = orderHistoryMapper.readValue(cached.toString(), ProductSnapshot.
		  class);
		                    resultMap.put(pId, snapshot);
		                } catch (Exception e) {
		                    missedIds.add(pId);
		                }
		            } else {
		                missedIds.add(pId);
		            }
		        }

		        // Fetch cache misses from Product Service
		        // Product Service queries DB and populates Redis on its end
		        if (!missedIds.isEmpty()) {
		            try {
		                List<ProductSnapshot> fetched = productRestClient.post()
		                        .uri("/api/v1/products/batch")
		                        .body(missedIds)
		                        .retrieve()
		                        .body(new ParameterizedTypeReference<List<ProductSnapshot>>() {});

		                if (fetched != null) {
		                    for (ProductSnapshot snapshot : fetched) {
		                        resultMap.put(snapshot.id(), snapshot);
		                    }
		                }
		            } catch (Exception e) {
		                log.error("Failed to batch fetch product snapshots for order history: {}", e.getMessage());
		            }
		        }

		        return resultMap;
		    }
		 //this is to get customer orders 

			public List<OrderHistoryResponse> getCustomerOrders(String customerId) {
				List<Order> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
				if (orders.isEmpty()) {
					return List.of();
				}

				// Collect unique product IDs across all orders
				Set<String> uniqueProductIds = new HashSet<>();
				for (Order order : orders) {
					for (OrderItem item : order.getItems()) {
						uniqueProductIds.add(item.getProductId());
					}
				}

				// Batch-fetch product snapshots in one shot
				Map<String, ProductSnapshot> productMap = fetchProductSnapshotsForOrders(
						new ArrayList<>(uniqueProductIds));

				// Build response list
				List<OrderHistoryResponse> responseList = new ArrayList<>();

				for (Order order : orders) {
					List<OrderHistoryResponse.OrderItemDto> itemDtos = new ArrayList<>();

					for (OrderItem item : order.getItems()) {
						ProductSnapshot product = productMap.get(item.getProductId());

						String productName = (product != null && product.name() != null) ? product.name()
								: "Product ("
										+ item.getProductId().substring(0, Math.min(8, item.getProductId().length()))
										+ ")";
						String imageUrl = (product != null) ? product.primaryImageUrl() : null;

						itemDtos.add(new OrderHistoryResponse.OrderItemDto(item.getProductId(), productName, imageUrl,
								item.getQuantity(), item.getUnitPrice(), item.getSubtotal()));
					}

					responseList.add(new OrderHistoryResponse(order.getOrderId(), order.getStatus(),
							order.getTotalAmount(), order.getShippingAddress(), order.getCreatedAt(), itemDtos));
				}

				return responseList;
			}
		}
