package com.platform.admin.controller;

import com.platform.admin.dto.AdminUserResponse;
import com.platform.admin.entity.AdminAction;
import com.platform.admin.repository.AdminActionRepository;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final AdminActionRepository adminActionRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminUserResponse>>> listUsers(Pageable pageable) {
        Page<AdminUserResponse> users = userRepository.findAll(pageable)
                .map(AdminUserResponse::fromEntity);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> getUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return ResponseEntity.ok(ApiResponse.success(AdminUserResponse.fromEntity(user)));
    }

    @PutMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<AdminUserResponse>> suspendUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setActive(false);
        userRepository.save(user);

        adminActionRepository.save(AdminAction.builder()
                .admin(admin.getUser())
                .action("SUSPEND_USER")
                .targetType("USER")
                .targetId(id)
                .details("Suspended user: " + user.getEmail())
                .build());

        return ResponseEntity.ok(ApiResponse.success("User suspended successfully", AdminUserResponse.fromEntity(user)));
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<AdminUserResponse>> restoreUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setActive(true);
        userRepository.save(user);

        adminActionRepository.save(AdminAction.builder()
                .admin(admin.getUser())
                .action("RESTORE_USER")
                .targetType("USER")
                .targetId(id)
                .details("Restored user: " + user.getEmail())
                .build());

        return ResponseEntity.ok(ApiResponse.success("User restored successfully", AdminUserResponse.fromEntity(user)));
    }
}
