package com.ecommerce.inventory_service.service;


import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import com.ecommerce.inventory_service.dto.InventoryInitRequestDto;
import com.ecommerce.inventory_service.dto.InventoryResponseDto;
import com.ecommerce.inventory_service.entity.Inventory;
import com.ecommerce.inventory_service.event.InventoryEvent;
import com.ecommerce.inventory_service.event.OrderCreatedEvent;
import com.ecommerce.inventory_service.repository.InventoryRepository;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class InventoryService {

	private final InventoryRepository inventoryRepository;
	private final RedisTemplate<String, Object> redisTemplate;
	private final RedisScript<Long> reserveStockLuaScript;
	private final KafkaTemplate<String, Object> kafkaTemplate;

	private static final String INVENTORY_TOPIC = "inventory-events";
	private static final String RESERVATIONS_ZSET = "inventory:reservation_expirations";
	private static final int BATCH_SIZE = 50;
	private final RedisScript<List> expirySweeperLuaScript;

	public InventoryService(InventoryRepository inventoryRepository, RedisTemplate<String, Object> redisTemplate,
			RedisScript<Long> reserveStockLuaScript, KafkaTemplate<String, Object> kafkaTemplate,
			RedisScript<List> expirySweeperLuaScript) {
		this.inventoryRepository = inventoryRepository;
		this.redisTemplate = redisTemplate;
		this.reserveStockLuaScript = reserveStockLuaScript;
		this.kafkaTemplate = kafkaTemplate;
		this.expirySweeperLuaScript = expirySweeperLuaScript;
	}

	// Reserves the stock in redis memory, no database connections are used
	public boolean reserveStock(String orderId, List<OrderCreatedEvent.OrderItemPayload> items) {
		// TODO Auto-generated method stub
		if(items ==null || items.isEmpty()) {
			log.warn("<<< [EMPTY ORDER ITEMS] Order: {} has no items to reserve", orderId);
            return false;
		}

        log.info(">>> [RESERVE BATCH ATTEMPT] OrderId: {}, Total Products: {}", orderId, items.size());
        
        List<OrderCreatedEvent.OrderItemPayload> successfullyReserved = new ArrayList<>();
        long expirationEpochSeconds = Instant.now().getEpochSecond() + 600; // 10 minutes hold
        
        for(OrderCreatedEvent.OrderItemPayload item : items) {
        	String stockKey = "inventory:stock:"+item.productId();
        	String reservationMember = orderId +":"+item.productId()+":"+item.quantity();
        	Long result = redisTemplate.execute(reserveStockLuaScript,Arrays.asList(stockKey,RESERVATIONS_ZSET)
        										,String.valueOf(item.quantity()),String.valueOf(expirationEpochSeconds),reservationMember);

            if (result != null && result == 1L) {
                // Item reserved successfully in Redis
                successfullyReserved.add(item);
            } else {
                // FAILURE: At least one item is OUT OF STOCK!
                log.warn("<<< [OUT OF STOCK FAIL] OrderId: {}, ProductId: {} has insufficient stock. Aborting order!",
                        orderId, item.productId());

                // Rollback any items that were reserved earlier in this same order loop!
                for (OrderCreatedEvent.OrderItemPayload rollbackItem : successfullyReserved) {
                    releaseStock(orderId, rollbackItem.productId(), rollbackItem.quantity());
                }

                // Publish single failure event to inventory-events
                kafkaTemplate.send(INVENTORY_TOPIC, orderId,
                        new InventoryEvent(orderId,"OUT_OF_STOCK"));
                return false;
            }
        }
        log.info(">>> [ALL ITEMS RESERVED] OrderId: {} successfully held in Redis for 10 minutes",
        		  orderId);
        kafkaTemplate.send(INVENTORY_TOPIC, orderId,
                new InventoryEvent(orderId, "RESERVED"));
        
        //reserving the order details to redis for committing inventory later 
        String reservationKey = "inventory:reservation:" + orderId;
        

        Map<String, String> hashBatch = new HashMap<>();
        for (OrderCreatedEvent.OrderItemPayload item : items) {
            hashBatch.put(item.productId(), String.valueOf(item.quantity()));
        }
        redisTemplate.opsForHash().putAll(reservationKey, hashBatch);
   
        // Set 13-minute TTL on the whole hash
        redisTemplate.expire(reservationKey, Duration.ofMinutes(13));

        return true;
        
        }
	
	

//	this is the commit stock that is triggered once the payment is confirmed a persistent record for the inventory change
//	is made to the postgres db
	 @Transactional
	    public void commitStock(String orderId, String status) {
	        log.info(">>> [COMMIT STOCK] Payment verified! Flushing OrderId: {}, status: {} toPostgreSQL",
	                 orderId, status);

	        String reservationKey = "inventory:reservation:" + orderId;
	        Map<Object, Object> reservedItems = redisTemplate.opsForHash().entries(reservationKey);

	        //  Handle duplicate Kafka redeliveries or expired keys
	        if (reservedItems == null || reservedItems.isEmpty()) {
	            log.warn(">>> [COMMIT WARNING] No active reservation found in Redis for OrderId: {}. It was already committed?",
	                     orderId);
	            return;
	        }

	        for (Map.Entry<Object, Object> entry : reservedItems.entrySet()) {
	            String productId = (String) entry.getKey();
	            int quantity = Integer.parseInt(entry.getValue().toString());

	            //  Commit permanent stock deduction to PostgreSQL
	            int rowsUpdated = inventoryRepository.decrementStockAtomic(productId, quantity);
	            if (rowsUpdated == 0) {
	                log.error(">>> [COMMIT ERROR] Failed to decrement PostgreSQL stock for ProductId: {}. Row missing or total_stock < quantity!",
	                          productId);
	            }

	            //  Remove from ZSET so 10 min sweeper won't touch it
	            String reservationMember = orderId + ":" + productId + ":" + quantity;
	            redisTemplate.opsForZSet().remove(RESERVATIONS_ZSET, reservationMember);
	        }

	        //  Clear Redis hash
	        redisTemplate.delete(reservationKey);
	        log.info(">>> [COMMIT SUCCESSFUL] OrderId: {} fully committed to DB and Redis holds cleared.", orderId);
	    }

	// this is the release stock that needs to be called to release the stock(on
	// explicit user cancellation)
	public void releaseStock(String orderId, String productId, int quantity) {
		log.info("<<< [EXPLICIT RELEASE] User cancelled OrderId: {}. Restoring ProductId: {}, Qty: {} to Redis",
				orderId, productId, quantity);

		String reservationMember = orderId + ":" + productId + ":" + quantity;

		Double score = redisTemplate.opsForZSet().score(RESERVATIONS_ZSET, reservationMember);

		// only restore if the reservation still exists in the zset

		if (score != null) {
			redisTemplate.opsForZSet().remove(RESERVATIONS_ZSET, reservationMember);
			redisTemplate.opsForValue().increment("inventory:stock:" + productId, quantity);
			log.info("<<< [RELEASE COMPLETE] Stock restored to Redis for OrderId:{}", orderId);
		}

	}

	// Atomic expiry sweeper (every 15 seconds)
	 @Scheduled(fixedRate = 15000)
     public void sweepExpiredReservations() {
         long currentEpochSeconds = Instant.now().getEpochSecond();

         @SuppressWarnings("unchecked")
         List<String> expiredOrders = (List<String>) redisTemplate.execute(
                 expirySweeperLuaScript,
                 Collections.singletonList(RESERVATIONS_ZSET),
                 String.valueOf(currentEpochSeconds),
                 String.valueOf(BATCH_SIZE) 
         );

         if (expiredOrders != null && !expiredOrders.isEmpty()) {
             log.warn("<<< [SWEEPER RECLAIMED] Swept {} expired orders from Redis: {}",
                     expiredOrders.size(), expiredOrders);

             for (String expiredOrderId : expiredOrders) {
                 kafkaTemplate.send(INVENTORY_TOPIC, expiredOrderId,
                         new InventoryEvent(expiredOrderId, "HOLD_EXPIRED"));
             }
         }
     }

	// helper to pre-warm stock in redis
	public void setStockInRedis(String productId, int quantity) {
		redisTemplate.opsForValue().set("inventory:stock:" + productId, quantity);
		log.info(">>> [PRE-WARMED] ProductId: {} set to {} in Redis", productId, quantity);
	}

	// this is the logic that returns the product from id if it is in redis if not
	// it will fetch and store it in redis
	public InventoryResponseDto getStockByProductId(String productId) {

		String stockKey = "inventory:stock:" + productId;

		Object cachedStock = redisTemplate.opsForValue().get(stockKey);

		if (cachedStock != null) {
			int stock = Integer.parseInt(cachedStock.toString());

			return new InventoryResponseDto(productId, null, stock >5 ? null :stock, stock > 0);
		}

		// Cache miss: Query PostgreSQL
		Inventory inventory = inventoryRepository.findByProductId(productId)
				.orElseThrow(() -> new RuntimeException("Inventory not found for product: " + productId));

		// Backfill the redis with data from db

		redisTemplate.opsForValue().set(stockKey, String.valueOf(inventory.getTotalStock()));

		return new InventoryResponseDto(inventory.getProductId(), inventory.getSku(), inventory.getTotalStock() > 5 ? null : inventory.getTotalStock(),
				inventory.getTotalStock() > 0);

	}
	
	//this is the method for internal services to get the stock 
	 public InventoryResponseDto getExactStockByProductId(String productId) {
         String stockKey = "inventory:stock:" + productId;
         Object cachedStock = redisTemplate.opsForValue().get(stockKey);

         if (cachedStock != null) {
             int stock = Integer.parseInt(cachedStock.toString());
             return new InventoryResponseDto(productId, null, stock, stock > 0);
         }

         // Cache miss: Query PostgreSQL and backfill Redis
         Inventory inventory = inventoryRepository.findByProductId(productId)
                 .orElseThrow(() -> new RuntimeException("Inventory not found for product: " + productId));

         redisTemplate.opsForValue().set(stockKey, String.valueOf(inventory.getTotalStock()));

         return new InventoryResponseDto(inventory.getProductId(), inventory.getSku(), inventory.getTotalStock(), inventory.getTotalStock() > 0);
     }
	 
	// this lets the admin to set the inventory increase for the products
	@Transactional
	public InventoryResponseDto intializeInventory(InventoryInitRequestDto dto) {

		Inventory inventory = inventoryRepository.findByProductId(dto.productId())
				.orElse(Inventory.builder().productId(dto.productId()).sku(dto.sku()).totalStock(0).build());

		// Update DB stock
		inventory.setTotalStock(inventory.getTotalStock() + dto.totalStock());
		Inventory saved = inventoryRepository.save(inventory);

		// Warm up Redis stock key
		String stockKey = "inventory:stock:" + dto.productId();
		redisTemplate.opsForValue().set(stockKey, saved.getTotalStock());

		log.info(">>> [INVENTORY INITIALIZED] Product: {}, New Stock: {}", dto.productId(), saved.getTotalStock());

		return new InventoryResponseDto(saved.getProductId(), saved.getSku(), saved.getTotalStock(),
				saved.getTotalStock() > 0);
	}

	public List<InventoryResponseDto> getStockByBatch(List<String> productIds) {
		// TODO Auto-generated method stub
		if (productIds == null || productIds.isEmpty()) {
			return List.of();
		}

		List<String> stockKeys = new ArrayList<String>();

		for (String s : productIds) {
			stockKeys.add("inventory:stock:" + s);
		}

		List<Object> inventoryStock = redisTemplate.opsForValue().multiGet(stockKeys);
		List<String> missingProducts = new ArrayList<String>();
		List<InventoryResponseDto> inventoryResponseDtos = new ArrayList<InventoryResponseDto>();

		for (int i = 0; i < productIds.size(); i++) {
			Object val = inventoryStock.get(i);
			if (val != null) {
				int stock = Integer.parseInt(val.toString());
				inventoryResponseDtos.add(new InventoryResponseDto(productIds.get(i), null, stock>5?null:stock, stock > 0));
			} else {
				missingProducts.add(productIds.get(i));
			}
		}
		// return the list if there are no productid's missing
		if (missingProducts.isEmpty()) {
			return inventoryResponseDtos;
		}

		log.info(">>> [MISSING INVENTORY] A few missing Product id :{} , hitting db to fetch these products",
				missingProducts.toString());

		// hitting the db for the missing id
		List<Inventory> inventories = inventoryRepository.findAllByProductId(missingProducts);
		Map<String, String> keyValueMap = new HashMap<String, String>();
		// converting the inventory to response dto
		if (inventories != null && !inventories.isEmpty()) {
			for (Inventory inventory : inventories) {
				inventoryResponseDtos.add(new InventoryResponseDto(inventory.getProductId(), inventory.getSku(),
						inventory.getTotalStock() > 5 ?null : inventory.getTotalStock(), inventory.getTotalStock() > 0));
				keyValueMap.put("inventory:stock:" + inventory.getProductId(), inventory.getTotalStock().toString());
			}
			log.info(">>> [CACHE BACKFILL] writing missing inventory to redis cache ");
			redisTemplate.opsForValue().multiSet(keyValueMap);
		}

		return inventoryResponseDtos;
	}

	public String intializeMultipleInventory(@Valid List<InventoryInitRequestDto> dtos) {
		// TODO Auto-generated method stub
		if(dtos==null || dtos.isEmpty()) {
			return "Send valid list of dtos";
		}
		
		log.info(">>> [INVENTORY INITIALIZING] Initializing the input list of products");
		
		for(InventoryInitRequestDto inv : dtos) {
			Inventory inventory  = new Inventory ();
			inventory.setProductId(inv.productId());
			inventory.setSku(inv.sku());
			inventory.setTotalStock(inv.totalStock());
			inventoryRepository.save(inventory);
		}
		log.info(">>> [INVENTORY INITIALIZED] Initialized the input list of products");
		
		return "Successfully added the list of Inventory";
	}

}
