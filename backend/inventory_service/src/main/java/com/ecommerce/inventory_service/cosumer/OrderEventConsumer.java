package com.ecommerce.inventory_service.cosumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;


import lombok.extern.slf4j.Slf4j;

import com.ecommerce.inventory_service.event.OrderCreatedEvent;
import com.ecommerce.inventory_service.service.*;
@Component
@Slf4j
public class OrderEventConsumer {
	
	private final InventoryService inventoryService;
	
	public OrderEventConsumer(InventoryService inventoryService) {
		this.inventoryService=inventoryService;
	}
	
	@KafkaListener(topics = "order-events", groupId = "inventory-order-service-group", properties = {
			"spring.json.value.default.type=com.ecommerce.inventory_service.event.OrderCreatedEvent" })
	public void consumerOrderCreated(OrderCreatedEvent event) throws Exception {
		log.info(">> [KAFKA EVENT RECIEVED] Topic: order-events | OrderId: {} | ProductId: {}", event.orderId(),
				event.orderId(), event.items());

		inventoryService.reserveStock(event.orderId(), event.items());

	}
	
}
