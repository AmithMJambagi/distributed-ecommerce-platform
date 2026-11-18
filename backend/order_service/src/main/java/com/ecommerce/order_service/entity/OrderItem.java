package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_items", indexes = { @Index(name = "idx_order_items_order_id", columnList = "order_id") })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // For JPA reflection
@AllArgsConstructor
@Builder
public class OrderItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id", nullable = false)
	@Setter(AccessLevel.PACKAGE)
	private Order order;

	@Column(name = "product_id", nullable = false, length = 64)
	private String productId;

	@Column(name = "quantity", nullable = false)
	private Integer quantity;

	@Column(name = "unit_price", nullable = false)
	private Long unitPrice;

	// Factory method
	public static OrderItem createOrderItem(Order order , String productId, int quantity, Long unitPrice) {
		if (productId == null || productId.isBlank()) {
			throw new IllegalArgumentException("productId is required");
		}
		if (quantity <= 0) {
			throw new IllegalArgumentException("quantity must be greater than 0");
		}
		if (unitPrice == null || unitPrice < 0) {
			throw new IllegalArgumentException("unitPrice cannot be negative");
		}

		OrderItem item = new OrderItem();
		item.order = order;
		item.productId = productId;
		item.quantity = quantity;
		item.unitPrice = unitPrice;
		return item;
	}

	// this is the method to get the order total
	public Long getSubtotal() {
		return unitPrice * quantity;
	}
}
