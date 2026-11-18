package com.ecommerce.product_service.dto;

import java.time.Instant;
import java.util.*;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Data
public class ApiErrorResponse {
	private Instant timeStamp;
	private int status;
	private String error;

	private String message;
	private String path;
	private List<String> details;

	public ApiErrorResponse(int status, String error, String message, String path, List<String> details) {
		this.timeStamp = Instant.now();
		this.status = status;
		this.error = error;
		this.message = message;
		this.path = path;
		this.details = details;
	}
}
