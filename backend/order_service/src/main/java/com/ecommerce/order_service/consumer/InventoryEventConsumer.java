package com.ecommerce.order_service.consumer;

import org.springframework.kafka.annotation.KafkaListener;

import org.springframework.stereotype.Component;


import com.ecommerce.order_service.event.InventoryEvent;

import com.ecommerce.order_service.service.OrderService;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class InventoryEventConsumer {
	
	private final OrderService orderService;
	
	
	public InventoryEventConsumer(OrderService orderService) {
		this.orderService = orderService;
		
	}
	
	@KafkaListener(topics = "inventory-events",groupId = "order-inventory-service-group",properties = { "spring.json.value.default.type=com.ecommerce.order_service.event.InventoryEvent"})
	@Transactional
	public void consumeInventoryEvent(InventoryEvent event) {
		  log.info(">> [KAFKA EVENT RECEIVED] Topic: inventory-events | OrderId: {} | Status: {}",
				                     event.orderId(), event.status());
		  
		orderService.processInventoryResult(event.orderId(),event.status());
	}
}
