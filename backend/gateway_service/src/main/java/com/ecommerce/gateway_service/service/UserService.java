package com.ecommerce.gateway_service.service;

import com.ecommerce.gateway_service.dto.UpdateProfileRequest;
import com.ecommerce.gateway_service.dto.UserProfileResponse;
import com.ecommerce.gateway_service.entity.User;
import com.ecommerce.gateway_service.entity.UserDetail;
import com.ecommerce.gateway_service.repository.UserDetailRepository;
import com.ecommerce.gateway_service.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserDetailRepository userDetailRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            UserDetailRepository userDetailRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userDetailRepository = userDetailRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     *  Get authenticated user profile
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        UserDetail detail = user.getUserDetail();
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                detail != null ? detail.getFullName() : null,
                detail != null ? detail.getPhoneNumber() : null,
                detail != null ? detail.getAge() : null,
                detail != null ? detail.getGender() : null,
                detail != null ? detail.getAddress() : null,
                user.getRole().name()
        );
    }

    /**
     *  Update user profile and address
     */
    @Transactional
    public UserProfileResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        UserDetail detail = user.getUserDetail();
        if (detail == null) {
            detail = UserDetail.createInitialDetail(user, request.fullName() != null ? request.
fullName() : user.getEmail());
            user.linkUserDetail(detail);
        }

        detail.updateProfile(
                request.fullName(),
                request.phoneNumber(),
                request.age(),
                request.gender(),
                request.address()
        );
        userDetailRepository.save(detail);

        log.info(">> [PROFILE UPDATED] User: {}", userId);
        return getProfile(userId);
    }

    /**
     *  Change/Reset password for authenticated user
     */
    @Transactional
    public void changePassword(String userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password cannot be empty");
        }

        String hashedPassword = passwordEncoder.encode(newPassword);
        user.updatePassword(hashedPassword);
        userRepository.save(user);

        log.info(">> [PASSWORD CHANGED] Successfully updated password for user: {}", userId);
    }
}