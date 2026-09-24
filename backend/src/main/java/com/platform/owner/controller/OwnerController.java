package com.platform.owner.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.CreateOwnerProfileRequest;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.dto.OwnerVerificationStatusResponse;
import com.platform.owner.service.OwnerProfileService;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/owners")
@RequiredArgsConstructor
public class OwnerController {

    private final OwnerProfileService ownerProfileService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> registerOwner(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateOwnerProfileRequest request) {

        User currentUser = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + principal.getId()));

        OwnerProfileResponse response = ownerProfileService.registerOwner(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Owner registered successfully", response));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {

        OwnerProfileResponse response = ownerProfileService.getOwnerProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Owner profile retrieved successfully", response));
    }

    @PostMapping("/verification/submit")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> submitForVerification(
            @AuthenticationPrincipal UserPrincipal principal) {

        OwnerProfileResponse response = ownerProfileService.submitForVerification(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Owner verification submitted successfully", response));
    }

    @GetMapping("/verification/status")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<OwnerVerificationStatusResponse>> getVerificationStatus(
            @AuthenticationPrincipal UserPrincipal principal) {

        OwnerVerificationStatusResponse response = ownerProfileService.getVerificationStatus(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Owner verification status retrieved successfully", response));
    }

    @DeleteMapping("/account")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteOwnerAccount(
            @AuthenticationPrincipal UserPrincipal principal) {

        ownerProfileService.deleteOwnerAccount(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Owner account and all associated documents permanently deleted", null));
    }
}
