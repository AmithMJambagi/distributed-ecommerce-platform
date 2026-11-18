package com.ecommerce.gateway_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(
    name = "user_details",
    indexes = {
        @Index(name = "idx_user_details_user_id", columnList = "user_id")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.PACKAGE)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", nullable = false, length = 128)
    private String fullName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber; 

    @Column(name = "age")
    private Integer age; 

    @Column(name = "gender", length = 16)
    private String gender; 

    @Column(name = "address", columnDefinition = "TEXT")
    private String address; 

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    // Factory method called during user registration
    public static UserDetail createInitialDetail(User user, String fullName) {
        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("Full name is required");
        }
        UserDetail detail = new UserDetail();
        detail.user = user;
        detail.fullName = fullName.trim();
        return detail;
    }

    // Domain method for updating profile and address
	public void updateProfile(String fullName, String phoneNumber, Integer age, String gender, String address) {
		if (fullName != null && !fullName.isBlank()) {
			this.fullName = fullName.trim();
		}
		if (phoneNumber != null) {
			this.phoneNumber = phoneNumber.trim();
		}
		this.age = age;
		if (gender != null) {
			this.gender = gender.trim().toUpperCase();
		}
		if (address != null) {
			this.address = address.trim();
		}
	}
}
