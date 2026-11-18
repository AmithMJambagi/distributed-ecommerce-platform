package com.ecommerce.product_service.dto;
import java.io.Serializable;
import java.util.List;
public record CategoryPageCache (List<String> productIds, long totalElements) implements Serializable{

}
