package com.ecommerce.payment_service.entity;

import java.time.ZonedDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, unique = true, length = 64)
    private String orderId;

    @Column(name = "customer_id", nullable = false, length = 64)
    private String customerId;

    @Column(name = "razorpay_order_id", unique = true, length = 64)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", unique = true, length = 64)
    private String razorpayPaymentId;

    @Column(name = "amount", nullable = false)
    private Long amount; 

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PaymentStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

	//  method for initial creation
	public static Payment create(String orderId, String customerId, String razorpayOrderId, Long amount) {
		Payment payment = new Payment();
		payment.orderId = orderId;
		payment.customerId = customerId;
		payment.razorpayOrderId = razorpayOrderId;
		payment.amount = amount;
		payment.status = PaymentStatus.CREATED;
		return payment;
	}

    //  Successful Payment
    public void markSuccess(String razorpayPaymentId) {
        if (this.status == PaymentStatus.SUCCESS) {
            return; // Idempotent no-op
        }
        if (this.status == PaymentStatus.FAILED) {
            throw new IllegalStateException("Cannot transition FAILED payment to SUCCESS for order " + this.orderId);
        }
        this.razorpayPaymentId = razorpayPaymentId;
        this.status = PaymentStatus.SUCCESS;
    }

    // Failed Payment
    public void markFailed() {
        if (this.status == PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Cannot mark SUCCESS payment as FAILED for order " + this.orderId);
        }
        this.status = PaymentStatus.FAILED;
    }

	public void markRefunded(String paymentId) {
		// TODO Auto-generated method stub
		this.status = PaymentStatus.REFUNDED;
	}
}
