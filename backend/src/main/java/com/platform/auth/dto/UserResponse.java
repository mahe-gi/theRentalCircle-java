package com.platform.auth.dto;

import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String email;
    private String mobile;
    private String firstName;
    private String lastName;
    private String userType;
    private boolean isActive;
    private boolean isEmailVerified;
    private boolean isMobileVerified;
    private Set<String> roles;
    private Instant createdAt;

    public static UserResponse fromUser(User user) {
        Set<String> roleNames = user.getRoles() != null
                ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet())
                : Set.of();

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .userType(user.getUserType())
                .isActive(user.isActive())
                .isEmailVerified(user.isEmailVerified())
                .isMobileVerified(user.isMobileVerified())
                .roles(roleNames)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
