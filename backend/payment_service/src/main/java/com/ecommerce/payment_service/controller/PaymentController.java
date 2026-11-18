package com.ecommerce.payment_service.controller;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.payment_service.dto.PaymentDetailsResponse;
import com.ecommerce.payment_service.entity.PaymentStatus;
import com.ecommerce.payment_service.service.PaymentService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/payments")
@Slf4j
public class PaymentController {

	private final PaymentService paymentService;

	@Value("${razorpay.frontend-success-url:http://localhost:5173/order-success}")
	private String frontendSuccessUrl;

	public PaymentController(PaymentService paymentService) {
		this.paymentService = paymentService;
	}

	/**
	 * Fetch active payment details and the 10-minute hosted URL (read from Redis).
	 */
	@GetMapping("/{orderId}")
	public ResponseEntity<PaymentDetailsResponse> getPaymentDetails(@PathVariable String orderId) {
		return ResponseEntity.ok(paymentService.getPaymentDetails(orderId));
	}

	/**
	 * Browser redirect callback sent automatically by Razorpay upon payment completion.
	 * Redirects browser directly back to the React application's /order-success view.
	 */
	@GetMapping("/callback")
	public ResponseEntity<Void> handleRazorpayCallback(@RequestParam("order_id") String orderId,
			@RequestParam(value = "razorpay_payment_id", required = false) String paymentId,
			@RequestParam(value = "razorpay_payment_link_id", required = false) String linkId,
			@RequestParam(value = "razorpay_signature", required = false) String signature,
			@RequestParam(value = "razorpay_payment_link_status", required = false) String linkStatus) {

		log.info(">> [PAYMENT CALLBACK] OrderId: {} | PaymentId: {} | Status: {}", orderId, paymentId, linkStatus);

		PaymentStatus result = paymentService.verifyPaymentCallback(orderId, paymentId, linkId, signature, linkStatus);

		String redirectUrl;
		if (result == PaymentStatus.SUCCESS) {
			redirectUrl = String.format("%s?order_id=%s&payment_id=%s&status=SUCCESS",
					frontendSuccessUrl, orderId, paymentId != null ? paymentId : "");
		} else if (result == PaymentStatus.REFUNDED) {
			redirectUrl = String.format("%s?order_id=%s&payment_id=%s&status=REFUNDED",
					frontendSuccessUrl, orderId, paymentId != null ? paymentId : "");
		} else {
			redirectUrl = String.format("%s?order_id=%s&status=FAILED",
					frontendSuccessUrl, orderId);
		}

		log.info(">> [PAYMENT REDIRECT] Redirecting user to frontend: {}", redirectUrl);

		return ResponseEntity.status(HttpStatus.FOUND)
				.location(URI.create(redirectUrl))
				.build();
	}
}
