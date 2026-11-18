package com.ecommerce.product_service.dto;

import lombok.Data;

@Data
public class ResponseMessage {
	
	String message;
	
	public ResponseMessage(String message) {
		this.message=message;
	}
}
