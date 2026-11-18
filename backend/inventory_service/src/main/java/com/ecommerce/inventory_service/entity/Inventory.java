package com.ecommerce.inventory_service.entity;

import java.time.ZonedDateTime;

import org.hibernate.annotations.UpdateTimestamp;


import jakarta.validation.constraints.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "inventory", indexes = {
		@Index(name = "idx_inventory_product_id", columnList = "product_id", unique = true) })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {
	@Id
	@GeneratedValue(strategy = GenerationType.SEQUENCE)
	private Long id;
	
	@NotNull
	@Column(name = "product_id" ,nullable= false)
	private String productId;
	
	@NotNull
	@Column(nullable = false)
	@Min(value = 0 , message = "The stock cannot be negative")
	private Integer totalStock;
	
	@NotNull
	@Column(nullable = false)
	private String sku;
	
	@UpdateTimestamp
	@Column(name = "updated_at")
	private ZonedDateTime updatedAt;

}
