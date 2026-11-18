package com.ecommerce.product_service.entity;

import java.time.*;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.validation.constraints.*;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "product")
@Getter
@Setter
@NoArgsConstructor
public class Product {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private String id;
	
	@NotNull
	@Column(nullable = false)
	private String name;

	@Column(columnDefinition = "TEXT")
	private String description;
	
	@NotNull
	@Column(nullable = false, unique = true)
	private String sku;
	
	@Min(value = 0, message = "Price cannot be negative")
	private long price;
	
	@NotNull
	@Column(nullable = false)
	private long categoryId;

	@Enumerated(EnumType.STRING)
	private Status status;

	@Column(length = 1024)
	private String primaryImageUrl;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private List<String> galleryImages;
	
	@CreationTimestamp
	@Column(updatable = false, nullable = false)
	private ZonedDateTime createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private ZonedDateTime updatedAt;

}
