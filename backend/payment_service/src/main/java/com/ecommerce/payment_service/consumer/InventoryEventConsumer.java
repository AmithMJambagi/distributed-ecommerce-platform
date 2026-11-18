package com.ecommerce.payment_service.consumer;


import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.ecommerce.payment_service.event.InventoryEvent;
import com.ecommerce.payment_service.service.PaymentService;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class InventoryEventConsumer {

    private final PaymentService paymentService;

    public InventoryEventConsumer(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @KafkaListener(
        topics = "inventory-events",
        groupId = "payment-inventory-service-group", 
        properties = {
            "spring.json.value.default.type=com.ecommerce.payment_service.event.InventoryEvent"
        }
    )
    public void consumeInventoryEvent(InventoryEvent event) {
        // Payment Service ONLY cares about HOLD_EXPIRED
        if ("HOLD_EXPIRED".equalsIgnoreCase(event.status())) {
            log.info(">> [KAFKA EVENT RECEIVED] Topic: inventory-events | OrderId: {} |Status: HOLD_EXPIRED", event.orderId());
            paymentService.handleHoldExpired(event.orderId());
        }
    }
}