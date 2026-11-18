package com.ecommerce.order_service.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.ecommerce.order_service.event.PaymentResultEvent;
import com.ecommerce.order_service.service.OrderService;


import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class PaymentEventConsumer {

	private final OrderService orderService;

	public PaymentEventConsumer(OrderService orderService) {
		this.orderService = orderService;
	}

	@KafkaListener(topics = "payment-events", groupId = "order-service-payment-group", properties = {
			"spring.json.value.default.type=com.ecommerce.order_service.event.PaymentResultEvent" })
	public void consumePaymentEvent(PaymentResultEvent event) {
		log.info(">> [KAFKA EVENT RECEIVED] Topic: payment-events | OrderId: {} | Status:{}", event.orderId(),
				event.status());

		orderService.processPaymentEvent(event.orderId(), event.status());
	}
}
