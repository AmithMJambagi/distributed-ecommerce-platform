package com.ecommerce.gateway_service.service;

import com.ecommerce.gateway_service.dto.AuthResponse;
import com.ecommerce.gateway_service.dto.LoginRequest;
import com.ecommerce.gateway_service.dto.OtpLoginRequest;
import com.ecommerce.gateway_service.dto.RegisterRequest;
import com.ecommerce.gateway_service.dto.SendOtpRequest;

import com.ecommerce.gateway_service.entity.Role;
import com.ecommerce.gateway_service.entity.User;
import com.ecommerce.gateway_service.entity.UserDetail;

import com.ecommerce.gateway_service.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Slf4j
public class AuthService {

	private static final String OTP_PREFIX = "otp:";
	private static final Duration OTP_TTL = Duration.ofMinutes(5);

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final StringRedisTemplate redisTemplate;
	private final EmailService emailService;

	public AuthService(UserRepository userRepository,
			PasswordEncoder passwordEncoder, JwtService jwtService, StringRedisTemplate redisTemplate,
			EmailService emailService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.redisTemplate = redisTemplate;
		this.emailService = emailService;
	}

	/**
	 * Register/setup new user with email, OTP, and fullName (password optional, can be set later in profile)
	 */
	@Transactional
	public AuthResponse register(RegisterRequest request) {
		String normalizedEmail = request.email().toLowerCase().trim();

		if (userRepository.existsByEmail(normalizedEmail)) {
			throw new IllegalArgumentException("Email is already registered: " + normalizedEmail);
		}

		String storedOtp = redisTemplate.opsForValue().get(OTP_PREFIX + normalizedEmail);
		if (storedOtp == null || !storedOtp.equals(request.otp().trim())) {
			throw new IllegalArgumentException("Invalid or expired OTP");
		}
		// Invalidate OTP after successful registration
		redisTemplate.delete(OTP_PREFIX + normalizedEmail);

		String userId = generateUserId();
		// Initial secure randomized password hash; user can set/change their custom password in profile
		String randomPassword = UUID.randomUUID().toString();
		String hashedPassword = passwordEncoder.encode(randomPassword);

		User user = User.createNewUser(userId, normalizedEmail, hashedPassword, Role.ROLE_USER);
		UserDetail detail = UserDetail.createInitialDetail(user, request.fullName().trim());
		user.linkUserDetail(detail);

		userRepository.save(user);
		log.info(">> [USER REGISTERED VIA OTP & NAME] Id: {} | Email: {} | FullName: {}", userId, normalizedEmail, request.fullName());

		String token = jwtService.generateToken(user);
		return buildAuthResponse(user, token);
	}

	/**
	 * Standard password-based login (optional for users who set a password in profile)
	 */
	@Transactional(readOnly = true)
	public AuthResponse loginWithPassword(LoginRequest request) {
		String normalizedEmail = request.email().toLowerCase().trim();

		User user = userRepository.findByEmail(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

		if (!passwordEncoder.matches(request.password(), user.getPassword())) {
			throw new IllegalArgumentException("Invalid email or password");
		}

		String token = jwtService.generateToken(user);
		log.info(">> [PASSWORD LOGIN SUCCESS] User: {}", user.getId());
		return buildAuthResponse(user, token);
	}

	/**
	 * Generate 6-digit OTP and store in Redis for 5 minutes (for both new and existing users)
	 */
	public void sendOtp(SendOtpRequest request) {
		String normalizedEmail = request.email().toLowerCase().trim();
		boolean userExists = userRepository.existsByEmail(normalizedEmail);

		  String type = (request.type() != null && !request.type().isBlank()) ? request.type() : "login";

		    if ("login".equalsIgnoreCase(type) && !userExists) {
		        throw new IllegalArgumentException("Account not found. Please register if you are a new user.");
		    }
		    if ("register".equalsIgnoreCase(type) && userExists) {
		        throw new IllegalArgumentException("Email is already registered. Please sign in.");
		    }

		// Generate 6-digit cryptographic code
		String otp = String.valueOf(ThreadLocalRandom.current().nextInt(100_000, 1_000_000));

		// Store in Redis with 5-minute TTL
		redisTemplate.opsForValue().set(OTP_PREFIX + normalizedEmail, otp, OTP_TTL);

		// Log to console for local inspection and developer testing
		log.info(">> [OTP GENERATED] Email: {} | (Valid for 5 mins)", normalizedEmail);

		// Dispatch via real SMTP email
		try {
			emailService.sendOtpEmail(normalizedEmail, otp);
		} catch (Exception e) {
			log.warn("Could not dispatch SMTP email (OTP still active in Redis): {}", e.getMessage());
		}
	}

	/**
	 * Login via OTP for registered users
	 */
	@Transactional(readOnly = true)
	public AuthResponse loginWithOtp(OtpLoginRequest request) {
		String normalizedEmail = request.email().toLowerCase().trim();
		String storedOtp = redisTemplate.opsForValue().get(OTP_PREFIX + normalizedEmail);

		if (storedOtp == null || !storedOtp.equals(request.otp().trim())) {
			throw new IllegalArgumentException("Invalid or expired OTP");
		}

		User user = userRepository.findByEmail(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("Account not found. Please provide your name to complete account registration."));

		// Invalidate OTP after successful login
		redisTemplate.delete(OTP_PREFIX + normalizedEmail);

		String token = jwtService.generateToken(user);
		log.info(">> [OTP LOGIN SUCCESS] User: {}", user.getId());
		return buildAuthResponse(user, token);
	}

	// Build upfront ID format: USR-YYYYMMDD-XXXXXX
	private String generateUserId() {
		String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
		int randomPart = ThreadLocalRandom.current().nextInt(100_000, 1_000_000);
		return "USR-" + datePart + "-" + randomPart;
	}

	// Build standard AuthResponse
	private AuthResponse buildAuthResponse(User user, String token) {
		String fullName = (user.getUserDetail() != null) ? user.getUserDetail().getFullName() : "";
		return new AuthResponse(token,
				new AuthResponse.UserSummary(user.getId(), user.getEmail(), fullName, user.getRole().name()));
	}
}
