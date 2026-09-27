package com.platform.admin.dto;

import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
public class AdminUserResponse {
    private Long id;
    private String email;
    private String mobile;
    private String firstName;
    private String lastName;
    private String userType;
    private boolean active;
    private boolean emailVerified;
    private boolean mobileVerified;
    private Set<String> roles;
    private Instant createdAt;

    public static AdminUserResponse fromEntity(User u) {
        return AdminUserResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .mobile(u.getMobile())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .userType(u.getUserType())
                .active(u.isActive())
                .emailVerified(u.isEmailVerified())
                .mobileVerified(u.isMobileVerified())
                .roles(u.getRoles() != null ? u.getRoles().stream().map(Role::getName).collect(Collectors.toSet()) : Set.of())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
