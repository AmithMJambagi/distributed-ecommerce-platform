package com.ecommerce.inventory_service.config;

import java.util.List;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.data.redis.serializer.StringRedisSerializer;



@Configuration
public class RedisConfig {

	@Value("${REDIS_HOST:${spring.data.redis.host:localhost}}")
	private String redisHost;

	@Value("${REDIS_PORT:${spring.data.redis.port:6379}}")
	private int redisPort;

	@Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);

        return template;
    }


	@Bean
	public RedissonClient redissonClient() {
		Config config = new Config();
		config.useSingleServer().setAddress("redis://" + redisHost + ":" + redisPort);
		return Redisson.create(config);
	}

	// atomic reservation _ zset hold
	 @Bean
	    public RedisScript<Long> reserveStockLuaScript() {
	        String script = """
	            local currentStock = tonumber(redis.call('get', KEYS[1]) or '0')
	            local requestedQty = tonumber(ARGV[1])

	            if currentStock >= requestedQty then
	                redis.call('decrby', KEYS[1], requestedQty)
	                redis.call('zadd', KEYS[2], tonumber(ARGV[2]), ARGV[3])
	                return 1
	            else
	                return 0
	            end
	            """;
	        return new DefaultRedisScript<>(script, Long.class);
	    }

	// sweeps the expired list of products and return the products to be cleaned
	@Bean
	public RedisScript<List> expirySweeperLuaScript() {
		String script = """
				             local max_score = ARGV[1]
				             if type(max_score) == "string" then
				                 max_score = string.gsub(max_score, '"', '')
				             end

				             local batch_limit = ARGV[2]
				             if type(batch_limit) == "string" then
				                 batch_limit = string.gsub(batch_limit, '"', '')
				             end
				             local limit_num = tonumber(batch_limit) or 50

				             -- Fetch up to limit_num expired reservations using numeric LIMIT
				             local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', max_score, 'LIMIT',
				0, limit_num)
				             local expired_orders = {}

				             if expired and #expired > 0 then
				                 for i, reservation in ipairs(expired) do
				                     local clean_res = string.gsub(reservation, '"', '')
				                     local order_id, product_id, quantity = string.match(clean_res, "([^:]+):([^:]+):([^:]+)")

				                     if order_id and product_id and quantity then
				                         redis.call('INCRBY', 'inventory:stock:' .. product_id, tonumber(quantity))
				                         table.insert(expired_orders, order_id)
				                     end

				                     redis.call('ZREM', KEYS[1], reservation)
				                 end
				             end

				             return expired_orders
				             """;
		return new DefaultRedisScript<>(script, List.class);
	}
}
