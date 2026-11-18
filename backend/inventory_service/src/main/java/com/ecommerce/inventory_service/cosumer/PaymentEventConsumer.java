package com.ecommerce.inventory_service.cosumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.ecommerce.inventory_service.event.PaymentResultEvent;
import com.ecommerce.inventory_service.service.InventoryService;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class PaymentEventConsumer {
private final InventoryService inventoryService;
	
	public PaymentEventConsumer(InventoryService inventoryService) {
		this.inventoryService=inventoryService;
	}
	
	@KafkaListener(topics = "payment-events", groupId = "inventory-service-payment-group", properties = {
			"spring.json.value.default.type=com.ecommerce.inventory_service.event.PaymentResultEvent" })
	public void consumerOrderCreated(PaymentResultEvent event) throws Exception {
		log.info(">> [KAFKA EVENT RECIEVED] Topic: payment-events | OrderId: {} | Status: {}", event.orderId(),
				event.status());

		if ("SUCCESS".equalsIgnoreCase(event.status())) {
			// Commit the stock permanently to PostgreSQL and clear the Redis hold
			inventoryService.commitStock(event.orderId(),event.status());
		}
		
	}
}
