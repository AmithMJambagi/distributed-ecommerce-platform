package com.ecommerce.product_service.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.ecommerce.product_service.dto.CategoryPageCache;
import com.ecommerce.product_service.dto.ProductRequestDto;
import com.ecommerce.product_service.dto.ProductResponseDto;
import com.ecommerce.product_service.dto.ResponseMessage;
import com.ecommerce.product_service.entity.Product;
import com.ecommerce.product_service.exception.ResourceNotFoundException;
import com.ecommerce.product_service.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ProductService {

	private final ProductRepository productRepository;
	private final ProductTransformer productTransformer;
	private final RedisTemplate<String, Object> redisTemplate;
	private final RedissonClient redissonClient;
	private final ObjectMapper mapper;
	
	public ProductService(ProductRepository productRepository, ProductTransformer productTransformer,
			RedisTemplate<String, Object> redisTemplate, RedissonClient redissonClient , ObjectMapper mapper) {
		// TODO Auto-generated constructor stub
		this.productRepository = productRepository;
		this.productTransformer = productTransformer;
		this.redisTemplate = redisTemplate;
		this.redissonClient = redissonClient;
		this.mapper=mapper;
	}

	// this is the method the retrieves the product based on the product id
	public ProductResponseDto getProductById(String id) {
		// TODO Auto-generated method stub
		String cacheKey = "product:" + id;
		// checking the redis first for the product before hitting the db
		 
		 Object cachedRaw = redisTemplate.opsForValue().get(cacheKey);
	        if (cachedRaw != null) {
	            try {
	                log.info(">>> [REDIS CACHE HIT] Product ID: {}", id);
	                return mapper.readValue(cachedRaw.toString(), ProductResponseDto.class);
	            } catch (Exception ex) {
	                log.warn("Corrupted JSON in key {}, evicting: {}", cacheKey, ex.getMessage());
	                redisTemplate.delete(cacheKey);
	            }
	        }

	        RLock lock = redissonClient.getLock("lock:product:" + id);
	        lock.lock();

	        try {
	            // Double-check cache inside lock
	            cachedRaw = redisTemplate.opsForValue().get(cacheKey);
	            if (cachedRaw != null) {
	                try {
	                    return mapper.readValue(cachedRaw.toString(), ProductResponseDto.class);
	                } catch (Exception ignored) {}
	            }

	            log.info(">>> [DATABASE QUERY] Fetching Product ID: {} from PostgreSQL", id);
	            Product product = productRepository.findById(id)
	                    .orElseThrow(() -> new ResourceNotFoundException("The Product with id " + id + " was not found"));

	            ProductResponseDto productDto = productTransformer.productResponseBuilder(product);

	            // Write Dto  with 10-minute TTL
	            try {
	                
	                redisTemplate.opsForValue().set(cacheKey, productDto, Duration.ofMinutes(10));
	            } catch (Exception ex) {
	                log.warn("Failed to serialize product:{} to Redis: {}", id, ex.getMessage());
	            }

	            return productDto;
	        } finally {
	            lock.unlock();
	        }
	}

	// this method returns a pagenated list of products according to the category
	// requested by the user
	public Page<ProductResponseDto> getProductListByCategory(Long categoryId, Integer page, Integer size)
			throws IllegalArgumentException {
		// TODO Auto-generated method stub
		int pageNumber = (page == null || page < 0) ? 0 : page;
		int pageSize = (size == null || size <= 0) ? 20 : size;
		Pageable pageable = PageRequest.of(pageNumber, pageSize);

		// this is a cachekey with category id's and page and numbers with values being
		// the ids of products that are being fetched
		String cacheKey = "category:" + (categoryId == null ? "all" : categoryId) + ":page:" + pageNumber + ":size:"
				+ pageSize;

		// attempt to read the index from the redis cache
		Object cachedRaw = redisTemplate.opsForValue().get(cacheKey);

		if (cachedRaw != null) {
			CategoryPageCache cachedPage = mapper.convertValue(cachedRaw, CategoryPageCache.class);
			log.info(">>> [CATEGORY CACHE HIT] Key: {}", cacheKey);
			List<ProductResponseDto> products = getProductByBatch(cachedPage.productIds());

			return new PageImpl<>(products, pageable, cachedPage.totalElements());
		}
		//on cache miss we check the db for the same key value
		log.info("<<< [CATEGORY CACHE MISS] Key: {}. Querying database",cacheKey);
		Page<Product> products = productRepository.findByCategoryId(categoryId, pageable);
		
		//Extract the IDs and save index to Redis
		List<String> productIds=products.getContent()
				.stream()
				.map(Product::getId)
				.toList();
		
		CategoryPageCache pageIndex =  new CategoryPageCache(productIds,products.getTotalElements());
		redisTemplate.opsForValue().set(cacheKey,pageIndex,Duration.ofMinutes(5));
		
		//return DTO page
		return products.map(productTransformer::productResponseBuilder);
	}

	// this is the method that reduces the db trips and get's the products for the
	// cart service and the order service in one db trip and one api call
	public List<ProductResponseDto> getProductByBatch(List<String> productIds) {
		// TODO Auto-generated method stub
		if (productIds == null || productIds.isEmpty()) {
            return List.of();
        }

        List<String> cacheKeys = productIds.stream().map(id -> "product:" + id).toList();
        List<Object> cachedObjects = redisTemplate.opsForValue().multiGet(cacheKeys);

        List<ProductResponseDto> resultList = new ArrayList<>();
        List<String> missedKeys = new ArrayList<>();

        for (int i = 0; i < productIds.size(); i++) {
            Object raw = (cachedObjects != null) ? cachedObjects.get(i) : null;
            if (raw != null) {
                try {
                    resultList.add(mapper.readValue(raw.toString(), ProductResponseDto.class));
                } catch (Exception e) {
                    missedKeys.add(productIds.get(i));
                }
            } else {
                missedKeys.add(productIds.get(i));
            }
        }

        if (!missedKeys.isEmpty()) {
            log.info(">>> [BATCH CACHE MISS] Fetching {} missing products from DB", missedKeys.size());
            List<Product> dbProducts = productRepository.findAllById(missedKeys);
            List<ProductResponseDto> fetchedDtos = dbProducts.stream()
                    .map(productTransformer::productResponseBuilder)
                    .toList();

            //adding each product to redis
            for (ProductResponseDto dto : fetchedDtos) {
                redisTemplate.opsForValue().set("product:" + dto.id(), dto, Duration.ofMinutes(10));
            }

            resultList.addAll(fetchedDtos);
        }

        return resultList;
	}

	// this a api that allows admin to add a product to the product db to display it
	// to the end user
	public ResponseMessage addProduct(ProductRequestDto productRequestDto) {
		// TODO Auto-generated method stub
		if (productRequestDto == null) {
			return new ResponseMessage("The product Details cannot be null");
		}

		Product product = productTransformer.productRequestBuilder(productRequestDto);
		if (product == null) {
			return new ResponseMessage("There was a problem in saving the product");
		}
		productRepository.save(product);
		return new ResponseMessage("The Product was saved successfully");
	}

	public ResponseMessage addProducts(List<ProductRequestDto> productList) {
		// TODO Auto-generated method stub
		if (productList == null || productList.isEmpty()) {
			return new ResponseMessage("The list is empty products not added");

		}

		List<Product> products = new ArrayList<>();

		for (ProductRequestDto p : productList) {
			products.add(productTransformer.productRequestBuilder(p));
		}

		productRepository.saveAll(products);
		return new ResponseMessage("The list of products added sucessfully");
	}

	public List<ProductResponseDto> getAllProducts() {
		// TODO Auto-generated method stub
		String cacheKey = "allProducts";
		
		@SuppressWarnings("unchecked")
		List<ProductResponseDto> cached =  (List<ProductResponseDto>) redisTemplate.opsForValue().get(cacheKey);
		
		if(cached!=null) {
			log.info(">>>CACHE HIT product is found in the cache");
			return cached;
		}
		log.info(">>>CACHE MISS product is not found in the cache hitting db to fetch products");
		
		List<Product> products = productRepository.findAll();
		List<ProductResponseDto> productResponse = new ArrayList<ProductResponseDto>();
		for(Product p :products) {
			productResponse.add(productTransformer.productResponseBuilder(p));
		}
		
		log.info(">>>Setting the value of products fetched from db to the cache");
		
		redisTemplate.opsForValue().set(cacheKey, productResponse);
		return productResponse;
	}
	
	//this service method updates the product with the new details incoming from the user
	public ProductResponseDto updateProduct(String id, ProductRequestDto dto) {
		// TODO Auto-generated method stub
		Product existingProduct = productRepository.findById(id).
				orElseThrow(() -> new ResourceNotFoundException("The Product with id "+id+" was not found"));
		Product updatedProduct = productTransformer.updateProductEntity(existingProduct,dto);
		
		//persist the updated product to the db
		Product savedProduct = productRepository.save(updatedProduct);
		
		//cache invalidation 
		String cacheKey ="product:"+id;
		
		Boolean deleted = redisTemplate.delete(cacheKey);
		 log.info(">>> [CACHE EVICTION] Evicted key: {}. Success: {}", cacheKey, deleted);
		
		 return productTransformer.productResponseBuilder(savedProduct);
	}

}
