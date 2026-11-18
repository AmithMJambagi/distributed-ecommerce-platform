package com.ecommerce.payment_service.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.ecommerce.payment_service.event.PaymentRequestEvent;
import com.ecommerce.payment_service.service.PaymentService;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class PaymentRequestConsumer {
	
	private final PaymentService paymentService;
	
	public PaymentRequestConsumer(PaymentService paymentService) {
		this.paymentService=paymentService;
	}
	
	@KafkaListener(
	        topics = "payment-requests",
	        groupId = "payment-service-group",
	        properties = {
	            "spring.json.value.default.type=com.ecommerce.payment_service.event.PaymentRequestEvent"
	        })
	public void consumePaymentRequest(PaymentRequestEvent event) {
		 log.info(">> [KAFKA EVENT RECEIVED] Topic: payment-requests | OrderId: {} | customerId: {} | totalAmount : {}",
                 event.orderId(), event.customerId(), event.totalAmount());
		 paymentService.initiatePayment(event.orderId(),event.customerId(),event.totalAmount());
	}
	
}
