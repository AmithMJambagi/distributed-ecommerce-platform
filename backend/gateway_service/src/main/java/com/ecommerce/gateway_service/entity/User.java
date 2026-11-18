package com.ecommerce.gateway_service.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "users",  indexes = {
        @Index(name = "idx_users_email", columnList = "email")})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @Column(name = "id", nullable = false, length = 64)
    private String id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    private Role role;

	@OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	private UserDetail userDetail;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    // Factory method for creating a user with their initial profile
    public static User createNewUser(String id, String email, String password, Role
    		  role) {
					if (id == null || id.isBlank())
						throw new IllegalArgumentException("User ID is required");
					if (email == null || email.isBlank())
						throw new IllegalArgumentException("Email is required");
					if (password == null || password.isBlank())
						throw new IllegalArgumentException("Password hash is required");

					User user = new User();
					user.id = id;
					user.email = email.toLowerCase().trim();
					user.password = password;
					user.role = (role != null) ? role : Role.ROLE_USER;
					return user;
				}

    		        // Helper to wire bidirectional 1-to-1 relationship with UserDetail
					public void linkUserDetail(UserDetail userDetail) {
						this.userDetail = userDetail;
						if (userDetail != null && userDetail.getUser() != this) {
							userDetail.setUser(this);
						}
					}

					public void updatePassword(String hashedPassword) {
						// TODO Auto-generated method stub
						this.password=hashedPassword;
					}
}