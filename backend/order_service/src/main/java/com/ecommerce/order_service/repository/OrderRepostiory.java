package com.ecommerce.order_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ecommerce.order_service.entity.Order;

import io.lettuce.core.dynamic.annotation.Param;

@Repository
public interface OrderRepostiory extends JpaRepository<Order, String> {

	Optional<Order> findByIdempotencyKey(String idempotencyKey);
	
	  @Query("SELECT o FROM Order o WHERE o.customerId = :customerId AND (o.status = 'CONFIRMED' OR o.status = 'CANCELLED') ORDER BY o.createdAt DESC")
	    List<Order> findByCustomerIdOrderByCreatedAtDesc(@Param("customerId") String customerId);

}
