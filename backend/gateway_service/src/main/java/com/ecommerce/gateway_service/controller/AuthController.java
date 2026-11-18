package com.ecommerce.gateway_service.controller;

import com.ecommerce.gateway_service.dto.AuthResponse;
import com.ecommerce.gateway_service.dto.LoginRequest;
import com.ecommerce.gateway_service.dto.OtpLoginRequest;
import com.ecommerce.gateway_service.dto.RegisterRequest;
import com.ecommerce.gateway_service.dto.SendOtpRequest;
import com.ecommerce.gateway_service.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	@PostMapping("/register")
	public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(authService.loginWithPassword(request));
	}

	@PostMapping("/otp/send")
	public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
		authService.sendOtp(request);
		return ResponseEntity.ok(Map.of("message", "OTP sent successfully to " + request.email()));
	}

	@PostMapping("/otp/login")
	public ResponseEntity<AuthResponse> loginWithOtp(@Valid @RequestBody OtpLoginRequest request) {
		return ResponseEntity.ok(authService.loginWithOtp(request));
	}
}
