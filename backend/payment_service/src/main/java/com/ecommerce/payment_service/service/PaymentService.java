package com.ecommerce.payment_service.service;

import java.time.Duration;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.ecommerce.payment_service.dto.PaymentDetailsResponse;
import com.ecommerce.payment_service.entity.Payment;
import com.ecommerce.payment_service.entity.PaymentStatus;
import com.ecommerce.payment_service.event.PaymentResultEvent;
import com.ecommerce.payment_service.repository.PaymentRepository;
import com.razorpay.PaymentLink;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;


import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;

@Service
@Slf4j
public class PaymentService {

	private static final String PAYMENT_EVENTS_TOPIC = "payment-events";
	private static final String REDIS_LINK_PREFIX = "payment:link:";

	private final PaymentRepository paymentRepository;
	private final RazorpayClient razorpayClient;
	private final StringRedisTemplate stringRedisTemplate;
	private final KafkaTemplate<String, Object> kafkaTemplate;

	@Value("${razorpay.key-secret}")
	private String keySecret;

	@Value("${razorpay.callback-url:http://localhost:8084/api/v1/payments/callback}")
	private String callbackUrl;

	public PaymentService(PaymentRepository paymentRepository, RazorpayClient razorpayClient,
			StringRedisTemplate stringRedisTemplate, KafkaTemplate<String, Object> kafkaTemplate) {
		this.paymentRepository = paymentRepository;
		this.razorpayClient = razorpayClient;
		this.stringRedisTemplate = stringRedisTemplate;
		this.kafkaTemplate = kafkaTemplate;

	}

	// this is the initiate payment method that starts the payment process for the
	// user to complete order
	@Transactional
	public void initiatePayment(String orderId, String customerId, Long totalAmount) {
		Optional<Payment> existing = paymentRepository.findByOrderId(orderId);
		if (existing.isPresent()) {
			log.info("Payment for orderId {} already initialized with status {}", orderId, existing.get().getStatus());
			return;
		}

		long amountInPaise = totalAmount * 100;
		try {
			PaymentLink paymentLink = createAndCachePaymentLink(orderId, amountInPaise);
			String paymentLinkId = paymentLink.get("id");
			Payment payment = Payment.create(orderId, customerId, paymentLinkId, amountInPaise);
			paymentRepository.save(payment);
		} catch (Exception e) {
			log.warn(">>> [RAZORPAY LINK DELAYED] Initial link generation failed for Order {}: {}. Saving as CREATED for on-demand retry.",
					orderId, e.getMessage());

			// Save payment as CREATED so user keeps their order & 10-minute inventory hold
			Payment payment = Payment.create(orderId, customerId, "PENDING_" + orderId, amountInPaise);
			paymentRepository.save(payment);
		}
	}

	public PaymentDetailsResponse getPaymentDetails(String orderId) {
		Payment payment = paymentRepository.findByOrderId(orderId)
				.orElseThrow(() -> new IllegalArgumentException("No payment record found for order: " + orderId));

		// fetch the 10 minute active payment link
		String paymentUrl = stringRedisTemplate.opsForValue().get(REDIS_LINK_PREFIX + orderId);

		// If link is missing and payment was marked as PENDING (or link generation was delayed), retry now!
		if (paymentUrl == null && payment.getStatus() == PaymentStatus.CREATED) {
			try {
				PaymentLink paymentLink = createAndCachePaymentLink(orderId, payment.getAmount());
				paymentUrl = paymentLink.get("short_url");
				log.info(">>> [RETRY LINK SUCCESS] Generated link on-demand for Order {}: {}", orderId, paymentUrl);
			} catch (Exception e) {
				log.warn(">>> [RETRY LINK PENDING] Razorpay link generation still pending for Order {}: {}", orderId, e.getMessage());
			}
		}

		return new PaymentDetailsResponse(
				payment.getOrderId(), paymentUrl, payment.getAmount(), payment.getStatus().name());
	}

	
	  //  helper to create Razorpay PaymentLink and cache URL in Redis for 10 minutes.
	 
	private PaymentLink createAndCachePaymentLink(String orderId, Long amountInPaise) throws Exception {
		JSONObject linkRequest = new JSONObject();
		linkRequest.put("amount", amountInPaise);
		linkRequest.put("currency", "INR");
		linkRequest.put("reference_id", orderId);
		linkRequest.put("description", "Payment for Order " + orderId);
		linkRequest.put("callback_url", callbackUrl + "?order_id=" + orderId);
		linkRequest.put("callback_method", "get");

		PaymentLink paymentLink = razorpayClient.paymentLink.create(linkRequest);
		String shortUrl = paymentLink.get("short_url");

		stringRedisTemplate.opsForValue().set(REDIS_LINK_PREFIX + orderId, shortUrl, Duration.ofMinutes(10));
		log.info(">>> Razorpay Link created for Order {}: id={}, url={}", orderId, paymentLink.get("id"), shortUrl);
		return paymentLink;
	}

	// this is the verification callback to check the status of the payment for the
	// orderId
	@Transactional
	public PaymentStatus verifyPaymentCallback(String orderId, String paymentId, String linkId, String signature,
			String linkStatus) {
		Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
		if (payment == null) {
			log.warn("Payment callback received for non-existent orderId: {}", orderId);
			return PaymentStatus.FAILED;
		}

		// Idempotency Guard: If already confirmed, do a safe no-op
		if (payment.getStatus() == PaymentStatus.SUCCESS) {
			log.info("Order {} is already confirmed as SUCCESS. Ignoring duplicate callback.", orderId);
			return PaymentStatus.SUCCESS;
		}
		
		//guard for the refunded payment to not process it further
		  if (payment.getStatus() == PaymentStatus.REFUNDED) {
		        log.info("Order {} was already refunded. Ignoring duplicate callback.", orderId);
		        return PaymentStatus.REFUNDED;
		    }

		// Check if Razorpay reports success and required tokens are present
		boolean isPaidStatus = "paid".equalsIgnoreCase(linkStatus);
		boolean hasRequiredTokens = paymentId != null && signature != null && linkId != null;

		if (!isPaidStatus || !hasRequiredTokens) {
			log.warn("Payment not completed for Order: {}. Status: {}. Allowing customer toretry.", orderId,
					linkStatus);
			// Leave status as CREATED so user can call getPaymentDetails and retry within
			// the10-min window!
			return PaymentStatus.FAILED;
		}

		try {
			// Cryptographic HMAC-SHA256 Signature Verification

			JSONObject attributes = new JSONObject();
			// Exact keys required by Razorpay Utils.verifyPaymentLink:
			attributes.put("payment_link_id", linkId);
			attributes.put("payment_link_reference_id", orderId);
			attributes.put("payment_link_status", linkStatus);
			attributes.put("razorpay_payment_id", paymentId);
			attributes.put("razorpay_signature", signature);

			boolean isSignatureValid = Utils.verifyPaymentLink(attributes, keySecret);

			if (isSignatureValid) {

				// late payment (user paid but 10 minute hold has already expired and marked
				// status failed
				if (payment.getStatus() == PaymentStatus.FAILED) {
					log.warn(
							">>> [LATE PAYMENT DETECTED] Order {} was already marked FAILED, but customer was charged {}. Initiating Auto-Refund via Razorpay.",
							orderId, paymentId);

					try {
						JSONObject refundRequest = new JSONObject();
						refundRequest.put("amount", payment.getAmount()); // in paise

						// Call Razorpay API to issue the refund to customer's bank
						razorpayClient.payments.refund(paymentId, refundRequest);

						// Update DB status to REFUNDED
						payment.markRefunded(paymentId);
						paymentRepository.save(payment);

						log.info(">>> [AUTO-REFUND COMPLETED] Refund processed for OrderId: {} |PaymentId: {}", orderId,
								paymentId);

					} catch (Exception e) {
						log.error(
								">>> [AUTO-REFUND ERROR] Failed to automatically refund PaymentId: {}  for OrderId: {}. Alerting support.",
								paymentId, orderId, e);
					}

					return PaymentStatus.REFUNDED; // Callback returns false so user is notified their order was
													// cancelled and refunded
				}
				// Update Database to SUCCESS & Record Bank Transaction ID
				payment.markSuccess(paymentId);
				paymentRepository.save(payment);

				// Publish SUCCESS to Kafka topic 'payment-events'
				kafkaTemplate.send(PAYMENT_EVENTS_TOPIC, orderId, new PaymentResultEvent(orderId, "SUCCESS"));

				log.info(">>> [PAYMENT VERIFIED & CONFIRMED] OrderId: {} | PaymentId: {}", orderId, paymentId);
				return PaymentStatus.SUCCESS;

			} else {
				log.warn(">>> [SIGNATURE MISMATCH] Invalid Razorpay signature for OrderId: {}", orderId);
				return PaymentStatus.FAILED;
			}

		} catch (Exception e) {
			log.error("Error verifying payment signature for OrderId: {}", orderId, e);
			return PaymentStatus.FAILED;
		}
	}

	// this is the method that handles clearing of the payment link and changing
	// status to failed if the order inventory expired
	@Transactional
	public void handleHoldExpired(String orderId) {
		Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
		if (payment == null) {
			return;
		}

		// If payment was already successful, do not touch it
		if (payment.getStatus() == PaymentStatus.SUCCESS) {
			log.warn(">>> [PAYMENT EXPIRED] Order {} hold expired in inventory. Payment SUCCESSFUL no changes made",
					orderId);
			return;
		}

		// If still in CREATED (unpaid after 10 mins):
		if (payment.getStatus() == PaymentStatus.CREATED) {
			payment.markFailed();
			paymentRepository.save(payment);

			// Evict ephemeral link from Redis
			stringRedisTemplate.delete(REDIS_LINK_PREFIX + orderId);

			log.warn(
					">>> [PAYMENT EXPIRED] Order {} hold expired in inventory. Payment marked FAILED & Redis link cleared.",
					orderId);
		}
	}
}
