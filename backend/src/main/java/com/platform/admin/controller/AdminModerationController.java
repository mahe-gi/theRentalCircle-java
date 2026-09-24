package com.platform.admin.controller;

import com.platform.admin.dto.ModerationDecisionRequest;
import com.platform.admin.service.AdminModerationService;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.VerificationStatus;
import com.platform.property.dto.PropertyDetailResponse;
import com.platform.property.dto.PropertyResponse;
import com.platform.property.entity.PropertyStatus;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;
    private final UserRepository userRepository;

    @GetMapping("/owners")
    public ResponseEntity<ApiResponse<Page<OwnerProfileResponse>>> listOwners(
            @RequestParam(required = false) VerificationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<OwnerProfileResponse> owners = adminModerationService.listOwners(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Owners retrieved successfully", owners));
    }

    @GetMapping("/owners/{id}")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> getOwner(@PathVariable Long id) {
        OwnerProfileResponse owner = adminModerationService.getOwner(id);
        return ResponseEntity.ok(ApiResponse.success("Owner retrieved successfully", owner));
    }

    @PutMapping("/owners/{id}/verify")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> verifyOwner(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) ModerationDecisionRequest request) {

        User admin = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with ID: " + principal.getId()));

        String remarks = (request != null) ? request.getRemarks() : null;
        OwnerProfileResponse response = adminModerationService.verifyOwner(id, admin, remarks);
        return ResponseEntity.ok(ApiResponse.success("Owner verified successfully", response));
    }

    @PutMapping("/owners/{id}/reject")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> rejectOwner(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) ModerationDecisionRequest request) {

        User admin = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with ID: " + principal.getId()));

        String remarks = (request != null) ? request.getRemarks() : null;
        OwnerProfileResponse response = adminModerationService.rejectOwner(id, admin, remarks);
        return ResponseEntity.ok(ApiResponse.success("Owner rejected successfully", response));
    }

    @PutMapping("/owners/{id}/request-info")
    public ResponseEntity<ApiResponse<OwnerProfileResponse>> requestMoreInfoOwner(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) ModerationDecisionRequest request) {

        User admin = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with ID: " + principal.getId()));

        String remarks = (request != null) ? request.getRemarks() : null;
        OwnerProfileResponse response = adminModerationService.requestMoreInfoOwner(id, admin, remarks);
        return ResponseEntity.ok(ApiResponse.success("Requested more information from owner", response));
    }

    @GetMapping("/properties")
    public ResponseEntity<ApiResponse<Page<PropertyResponse>>> listProperties(
            @RequestParam(required = false) PropertyStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<PropertyResponse> properties = adminModerationService.listProperties(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Properties retrieved successfully", properties));
    }

    @GetMapping("/properties/{id}")
    public ResponseEntity<ApiResponse<PropertyDetailResponse>> getProperty(@PathVariable Long id) {
        PropertyDetailResponse property = adminModerationService.getProperty(id);
        return ResponseEntity.ok(ApiResponse.success("Property retrieved successfully", property));
    }

    @PutMapping("/properties/{id}/approve")
    public ResponseEntity<ApiResponse<PropertyResponse>> approveProperty(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) ModerationDecisionRequest request) {

        User admin = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with ID: " + principal.getId()));

        String remarks = (request != null) ? request.getRemarks() : null;
        PropertyResponse response = adminModerationService.approveProperty(id, admin, remarks);
        return ResponseEntity.ok(ApiResponse.success("Property approved successfully", response));
    }

    @PutMapping("/properties/{id}/reject")
    public ResponseEntity<ApiResponse<PropertyResponse>> rejectProperty(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) ModerationDecisionRequest request) {

        User admin = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with ID: " + principal.getId()));

        String remarks = (request != null) ? request.getRemarks() : null;
        PropertyResponse response = adminModerationService.rejectProperty(id, admin, remarks);
        return ResponseEntity.ok(ApiResponse.success("Property rejected successfully", response));
    }

    @PutMapping("/properties/{id}/request-info")
    public ResponseEntity<ApiResponse<PropertyResponse>> requestMoreInfoProperty(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) ModerationDecisionRequest request) {

        User admin = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with ID: " + principal.getId()));

        String remarks = (request != null) ? request.getRemarks() : null;
        PropertyResponse response = adminModerationService.requestMoreInfoProperty(id, admin, remarks);
        return ResponseEntity.ok(ApiResponse.success("Requested more information for property", response));
    }
}
