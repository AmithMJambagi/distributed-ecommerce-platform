package com.ecommerce.order_service.entity;

import jakarta.persistence.Entity;

import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders", indexes = { @Index(name = "idx_orders_customer_id", columnList = "customer_id"), })
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class Order {

	@Id
	@Column(name = "order_id", nullable = false, length = 64)
	private String orderId;

	@Column(name = "customer_id", nullable = false, length = 64)
	private String customerId;

	@Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
	private Long totalAmount;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 32)
	private OrderStatus status;

	@Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
	private String idempotencyKey;

	@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	private List<OrderItem> items = new ArrayList<>();

	@CreationTimestamp
	@Column(name = "created_at", updatable = false)
	private ZonedDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at")
	private ZonedDateTime updatedAt;
	
	 @Column(name = "shipping_address")
	    private String shippingAddress;
	public void addItem(OrderItem item) {
		items.add(item);
		item.setOrder(this);
	}

	// Domain Guardrails
	public void markInventoryReserved() {
		if (this.status != OrderStatus.PENDING) {
			throw new IllegalStateException(
					String.format("Cannot reserve inventory for order %s in status %s", this.orderId, this.status));
		}
		this.status = OrderStatus.INVENTORY_RESERVED;
	}

	/**
	 * Guardrail: Transition to CONFIRMED (Payment Success) Allowed only if stock
	 * was reserved first (or pending initial check).
	 */
	public void markConfirmed() {
		if (this.status != OrderStatus.INVENTORY_RESERVED && this.status != OrderStatus.PENDING) {
			throw new IllegalStateException(
					String.format("Cannot confirm order %s. Expected INVENTORY_RESERVED or PENDING but was %s",
							this.orderId, this.status));
		}
		this.status = OrderStatus.CONFIRMED;
	}

	/**
	 * Guardrail: Transition to CANCELLED / EXPIRED
	 */
	public void markCancelled() {
		if (this.status == OrderStatus.CONFIRMED) {
			throw new IllegalStateException(
					String.format("Cannot cancel order %s because it is already CONFIRMED", this.orderId));
		}
		this.status = OrderStatus.CANCELLED;
	}

	// out of stock failure
	public void markFailedOutOfStock() {
		if (this.status != OrderStatus.PENDING) {
			throw new IllegalStateException(
					String.format("Cannot mark order %s as out of stock from status %s", this.orderId, this.status));
		}
		this.status = OrderStatus.FAILED_OUT_OF_STOCK;
	}

	public static Order createNewOrder(String orderId, String customerId, Long totalAmount, String idempotencyKey,String shippingAddress) {
		if (orderId == null || orderId.isBlank())
			throw new IllegalArgumentException("orderId is required");
		if (customerId == null || customerId.isBlank())
			throw new IllegalArgumentException("customerId is required");
		if (totalAmount == null || totalAmount <= 0) {
			throw new IllegalArgumentException("totalAmount must be greater than zero");
		}
		if (idempotencyKey == null || idempotencyKey.isBlank())
			throw new IllegalArgumentException("idempotencyKey is required");

		Order order = new Order();
		order.orderId = orderId;
		order.customerId = customerId;
		order.totalAmount = totalAmount;
		order.idempotencyKey = idempotencyKey;
		order.shippingAddress=shippingAddress;
		order.status = OrderStatus.PENDING; // Always starts at PENDING!
		return order;
	}

	

}
