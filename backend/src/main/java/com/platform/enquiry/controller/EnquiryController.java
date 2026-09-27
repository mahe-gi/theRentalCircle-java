package com.platform.enquiry.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.enquiry.dto.CreateEnquiryRequest;
import com.platform.enquiry.dto.EnquiryResponse;
import com.platform.enquiry.dto.UpdateEnquiryStatusRequest;
import com.platform.enquiry.service.EnquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class EnquiryController {

    private final EnquiryService enquiryService;

    @PostMapping("/api/v1/properties/{id}/enquiries")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<EnquiryResponse>> createEnquiry(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateEnquiryRequest req) {
        EnquiryResponse response = enquiryService.createEnquiry(principal.getUser(), id, req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Enquiry submitted successfully", response));
    }

    @GetMapping("/api/v1/enquiries/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<EnquiryResponse>>> getMyEnquiries(
            @AuthenticationPrincipal UserPrincipal principal,
            Pageable pageable) {
        Page<EnquiryResponse> response = enquiryService.getMyEnquiries(principal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/api/v1/enquiries/received")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Page<EnquiryResponse>>> getReceivedEnquiries(
            @AuthenticationPrincipal UserPrincipal principal,
            Pageable pageable) {
        Page<EnquiryResponse> response = enquiryService.getReceivedEnquiries(principal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/api/v1/enquiries/{id}/status")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<EnquiryResponse>> updateEnquiryStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateEnquiryStatusRequest req) {
        EnquiryResponse response = enquiryService.updateEnquiryStatus(id, principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.success("Enquiry status updated successfully", response));
    }
}
