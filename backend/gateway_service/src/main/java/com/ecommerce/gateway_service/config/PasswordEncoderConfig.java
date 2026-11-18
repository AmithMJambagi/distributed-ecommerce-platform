package com.ecommerce.gateway_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder.BCryptVersion;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;

@Configuration
public class PasswordEncoderConfig {
	//This bcrypt encoder uses salt that never gives the same hash for even the same password 
    @Bean
    public PasswordEncoder passwordEncoder() {
        // Explicitly use OS-level cryptographically secure random for the 128-bit salt
        SecureRandom secureRandom = new SecureRandom();

        
        return new BCryptPasswordEncoder(BCryptVersion.$2B, 12, secureRandom);
    }
}
