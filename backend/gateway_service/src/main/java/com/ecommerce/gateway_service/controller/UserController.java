package com.ecommerce.gateway_service.controller;

import com.ecommerce.gateway_service.dto.ChangePasswordRequest;
import com.ecommerce.gateway_service.dto.UpdateProfileRequest;
import com.ecommerce.gateway_service.dto.UserProfileResponse;
import com.ecommerce.gateway_service.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@RequestHeader("X-Customer-Id")
String userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestHeader("X-Customer-Id") String userId,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestHeader("X-Customer-Id") String userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userId, request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
