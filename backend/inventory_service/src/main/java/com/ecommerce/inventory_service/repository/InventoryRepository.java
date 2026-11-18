package com.ecommerce.inventory_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ecommerce.inventory_service.entity.Inventory;

import io.lettuce.core.dynamic.annotation.Param;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long>{
	@Modifying
	@Query("UPDATE Inventory i  SET i.totalStock = i.totalStock - :quantity WHERE i.productId = :productId AND i.totalStock >=:quantity  ")
	int decrementStockAtomic(@Param("productId")  String productId,@Param("quantity") int quantity);
	
	
	Optional<Inventory> findByProductId(String productId);

	@Query("SELECT i FROM Inventory i WHERE i.productId IN :missingProducts")
	List<Inventory> findAllByProductId(@Param("missingProducts")List<String> missingProducts);

}
