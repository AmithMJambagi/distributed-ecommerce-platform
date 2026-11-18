package com.ecommerce.order_service.exception;

public class CartLimitExceededException extends RuntimeException{
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	public CartLimitExceededException(String message) {
		super(message);
	}
}
