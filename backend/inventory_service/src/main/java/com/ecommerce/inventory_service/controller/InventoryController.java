package com.ecommerce.inventory_service.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.inventory_service.dto.InventoryInitRequestDto;
import com.ecommerce.inventory_service.dto.InventoryResponseDto;
import com.ecommerce.inventory_service.service.InventoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

	private final InventoryService inventoryService;

	public InventoryController(InventoryService inventoryService) {
		this.inventoryService = inventoryService;
	}

	// this is the client api to fetch the inventory values for a product
	@GetMapping("/{productId}")
	public ResponseEntity<InventoryResponseDto> getStockByProductId(@PathVariable String productId) {
		InventoryResponseDto dto = inventoryService.getStockByProductId(productId);

		return ResponseEntity.ok(dto);
	}

	// this is to update the inventory for the admin
	@PostMapping("/init")
	public ResponseEntity<InventoryResponseDto> initializeStock(@Valid @RequestBody InventoryInitRequestDto dto) {
		InventoryResponseDto responseDto = inventoryService.intializeInventory(dto);

		return ResponseEntity.ok(responseDto);
	}
	
	//this is to add the inventory in batches for the admin
	@PostMapping("/init/batch")
	public ResponseEntity<String> initializeMultipleStock( @RequestBody List<InventoryInitRequestDto> dtos){
		String output = inventoryService.intializeMultipleInventory(dtos);
		return ResponseEntity.ok(output);
	}
	//this is the endpoint to get the inventory quantities in batch 
	@PostMapping("/batch")
	public ResponseEntity<List<InventoryResponseDto>> getStockByBatch(@RequestBody  List<String> productIds){
		List<InventoryResponseDto> responseDto = inventoryService.getStockByBatch(productIds);
		
		return ResponseEntity.status(HttpStatus.OK).body(responseDto);
	}
	//Internal endpoint to check the inventory stock
	 @GetMapping("/internal/{productId}")
     public ResponseEntity<InventoryResponseDto> getExactStockByProductId(@PathVariable String productId) {
         InventoryResponseDto dto = inventoryService.getExactStockByProductId(productId);
         return ResponseEntity.ok(dto);
     }
}
