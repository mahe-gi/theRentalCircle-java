package com.platform.property.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.property.dto.*;
import com.platform.property.service.PropertyService;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/properties")
@PreAuthorize("hasRole('OWNER')")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<PropertyDetailResponse>> createDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePropertyRequest request) {

        User currentUser = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + principal.getId()));

        PropertyDetailResponse response = propertyService.createDraft(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Property draft created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PropertyDetailResponse>> getProperty(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {

        PropertyDetailResponse response = propertyService.getOwnerProperty(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Property retrieved successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PropertyDetailResponse>> updateDraft(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdatePropertyRequest request) {

        PropertyDetailResponse response = propertyService.updateDraft(id, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Property updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProperty(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {

        propertyService.deleteProperty(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Property deleted successfully", null));
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<PropertyDetailResponse>> submitProperty(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {

        PropertyDetailResponse response = propertyService.submitProperty(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Property submitted for review successfully", response));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<PropertyResponse>>> listOwnerProperties(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {

        Page<PropertyResponse> response = propertyService.listOwnerProperties(principal.getId(), status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Owner properties retrieved successfully", response));
    }
}
