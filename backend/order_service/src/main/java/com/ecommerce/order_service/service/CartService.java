package com.ecommerce.order_service.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.ecommerce.order_service.dto.CartItemRequest;
import com.ecommerce.order_service.dto.CartResponseDto;
import com.ecommerce.order_service.dto.InventoryResponseDto;
import com.ecommerce.order_service.dto.ProductSnapshot;
import com.ecommerce.order_service.exception.CartLimitExceededException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
@Service
@Slf4j
public class CartService {

	private final RedisTemplate<String, Object> redisTemplate;
	private final ObjectMapper objectMapper;
	private final RestClient productRestClient;
	private final RestClient inventoryRestClient;
	
	 //  Inject Spring Boot's auto-configured RestClient.Builder
    public CartService(
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder,
            @Value("${services.product-service.url}") String productServiceUrl,
            @Value("${services.inventory-service.url}") String inventoryServiceClient) {

        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;

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
	
	//this is the method to add the item into the cart 
	public Long addCartItem(String customerId, CartItemRequest request) {
		// TODO Auto-generated method stub
		String productId = request.productId();
		int quantity = request.quantity();

		String cartKey = "cart:" + customerId;
		//calculate the target quantity
		Object existingQtyObj = redisTemplate.opsForHash().get(cartKey, productId);
        int currentInCart = (existingQtyObj != null) ? Integer.parseInt(existingQtyObj.toString()) : 0;
        int targetTotal = currentInCart + quantity;
        
        //validate against the live inventory check
        int availableStock = getAvailableStock(productId);
        if (targetTotal > availableStock) {
            throw new CartLimitExceededException(
                String.format("Only %d units available in stock. You already have %d in your cart.",
                    availableStock, currentInCart)
            );
        }
        
		Long newQuantity = redisTemplate.opsForHash().increment(cartKey, productId, quantity);
		
		// refresh 14 day rolling ttl
		redisTemplate.expire(cartKey, Duration.ofDays(14));

		log.info(">>> [CART ITEM ADDED] Customer: {}, Product: {}, Quantity: {}", customerId, productId, newQuantity);

		return newQuantity;
	}
	
	//this is the service method that is being used 
	public void updateCartItemQuantity(String customerId, @Valid CartItemRequest request) {
		// TODO Auto-generated method stub

		String cartKey = "cart:" + customerId;

		String productId = request.productId();

		int quantity = request.quantity();

		if (quantity > 0) {
			// Overwrite quantity: HSET cart:customerId productId quantity
			  // Validate against live inventory before updating
            int availableStock = getAvailableStock(productId);
            if (quantity > availableStock) {
            	throw new CartLimitExceededException(
                        String.format("Only %d units available in stock.",
                            availableStock)
                    );
            }

            // Overwrite quantity: HSET cart:customerId productId quantity
            redisTemplate.opsForHash().put(cartKey, productId, String.valueOf(quantity));
            redisTemplate.expire(cartKey, Duration.ofDays(14));
            log.info(">>> [CART ITEM UPDATED] Customer: {}, Product: {}, Quantity: {}", customerId, productId, quantity);
		} else {
			// Quantity is 0: HDEL cart:customerId productId
			redisTemplate.opsForHash().delete(cartKey, productId);
			log.info(">>> [CART ITEM REMOVED VIA ZERO QTY] Customer: {}, Product: {}", customerId, productId);
		}

	}
	
	//logic to remove the item from the cart 
	public void removeCartItem(String customerId, String productId) {
		// TODO Auto-generated method stub
		String cartKey = "cart:" + customerId;
		redisTemplate.opsForHash().delete(cartKey, productId);
		log.info(">>> [CART ITEM REMOVED] Customer: {}, Product: {}", customerId, productId);
	}
	
	
	//logic to get the cart of the user
	public CartResponseDto getCart(String customerId) throws JsonMappingException, JsonProcessingException {
		// TODO Auto-generated method stub
		
		String cartKey = "cart:"+customerId;
		
		Map<Object,Object> rawCart = redisTemplate.opsForHash().entries(cartKey);
		
		  if (rawCart == null || rawCart.isEmpty()) {
              return new CartResponseDto(customerId, List.of(), 0L);
          }
		
		  // Prepare Redis keys for single multiGet pipeline
          List<String> productIds = new ArrayList<>();
          List<String> redisKeys = new ArrayList<>();
          
          for (Object key : rawCart.keySet()) {
              String pId = key.toString();
              productIds.add(pId);
              redisKeys.add("product:" + pId);
          }
          
          //check and get all the cached products from the redis cached cached by the product service 
          List<Object> cachedProducts= redisTemplate.opsForValue().multiGet(redisKeys);
          
          Map<String, ProductSnapshot> productMap = new HashMap<>();
          List<String> missedProductIds = new ArrayList<>();
          
          //Separate the cache hit's and misses 
          for(int i=0;i<productIds.size();i++) {
        	  String pId = productIds.get(i);
        	  Object cachedVal = (cachedProducts!=null) ? cachedProducts.get(i) :null;
        	  
        	  if(cachedVal!=null) {
        		  ProductSnapshot snapshot = objectMapper.readValue(cachedVal.toString(),ProductSnapshot.class);
        		  productMap.put(pId, snapshot);
        	  }else {
        		  missedProductIds.add(pId);
        	  }
          }
          
          // Batch fetch cache misses from Product Service via RestClient
          if(!missedProductIds.isEmpty()) {
        	  log.info(">>> [CART CACHE MISS] {} products missing from Redis. Batch fetching from Product Service: {}",
                      missedProductIds.size(), missedProductIds);
        	  
        	  try {
        		  
        		  List<ProductSnapshot> fetched = productRestClient.post()
        				  							.uri("/api/v1/products/batch")
        				  							.body(missedProductIds)
        				  							.retrieve()
        				  							.body(new ParameterizedTypeReference<List<ProductSnapshot>>() {
													});
        		  
        		  if (fetched != null) {
                      for (ProductSnapshot p : fetched) {
                          productMap.put(p.id(), p);
                      }
                  }
        	  }catch (Exception e) {
				// TODO: handle exception
        		  log.error("<<< [PRODUCT SERVICE CALL FAILED] Could not fetch batch products: {}", e.getMessage());
			}
        	  
        	  
          }
          //combining the cart quantities with the cart live product snapshot 
          
          List<CartResponseDto.CartItemDetail> items = new ArrayList<>();
          
          long grandTotal = 0L;
          
          for (String pId : productIds) {
              int quantity = Integer.parseInt(rawCart.get(pId).toString());
              ProductSnapshot product = productMap.get(pId);

              if (product != null) {
                  long unitPrice = product.price();
                  long subtotal = unitPrice * quantity;
                  grandTotal += subtotal;

                  items.add(new CartResponseDto.CartItemDetail(
                          pId,
                          product.name(),
                          product.primaryImageUrl(),
                          quantity,
                          unitPrice,
                          subtotal
                  ));
              } else {
                  //Discontinued or deleted in catalog. Auto-purge from user cart!
                log.warn("<<< [PURGE DISCONTINUED PRODUCT] Product {} not in catalog. Auto-removing from cart.", pId);
                  redisTemplate.opsForHash().delete(cartKey, pId);
              }
          }
          
		return new CartResponseDto(customerId,items,grandTotal);
	}
	
	
	//helper method to help get the inventory of the products from the inventory service
	private int getAvailableStock(String productId) {
         try {
             InventoryResponseDto response = inventoryRestClient.get()
                     .uri("/api/v1/inventory/internal/{productId}", productId)
                     .retrieve()
                     .body(InventoryResponseDto.class);

             if (response != null && response.isInStock()) {
                 return response.availableStock() != null ? response.availableStock() : 0;
             }
             return 0; // Out of stock or invalid
         } catch (Exception e) {
             log.error("<<< [INVENTORY CHECK FAILED] Could not verify stock for Product {}: {}",productId, e.getMessage());
             throw new RuntimeException("Unable to verify product stock at this time. Please try again.");
         }
     }
	

}
