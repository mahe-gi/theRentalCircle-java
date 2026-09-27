package com.platform.visit.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.visit.dto.CreateVisitRequest;
import com.platform.visit.dto.RejectVisitRequest;
import com.platform.visit.dto.RescheduleVisitRequest;
import com.platform.visit.dto.VisitResponse;
import com.platform.visit.service.VisitService;
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
public class VisitController {

    private final VisitService visitService;

    @PostMapping("/api/v1/properties/{id}/visits")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VisitResponse>> requestVisit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateVisitRequest req) {
        VisitResponse response = visitService.requestVisit(principal.getUser(), id, req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Visit scheduled successfully", response));
    }

    @GetMapping("/api/v1/visits/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<VisitResponse>>> getMyVisits(
            @AuthenticationPrincipal UserPrincipal principal,
            Pageable pageable) {
        Page<VisitResponse> response = visitService.getMyVisits(principal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/api/v1/visits/received")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Page<VisitResponse>>> getReceivedVisits(
            @AuthenticationPrincipal UserPrincipal principal,
            Pageable pageable) {
        Page<VisitResponse> response = visitService.getReceivedVisits(principal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/api/v1/visits/{id}/accept")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<VisitResponse>> acceptVisit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        VisitResponse response = visitService.acceptVisit(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Visit confirmed successfully", response));
    }

    @PutMapping("/api/v1/visits/{id}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<VisitResponse>> rejectVisit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) RejectVisitRequest req) {
        String reason = req != null ? req.getReason() : null;
        VisitResponse response = visitService.rejectVisit(id, principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.success("Visit declined", response));
    }

    @PutMapping("/api/v1/visits/{id}/reschedule")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<VisitResponse>> rescheduleVisit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RescheduleVisitRequest req) {
        VisitResponse response = visitService.rescheduleVisit(id, principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.success("Visit rescheduled", response));
    }

    @PutMapping("/api/v1/visits/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VisitResponse>> cancelVisit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        VisitResponse response = visitService.cancelVisit(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Visit cancelled", response));
    }

    @PutMapping("/api/v1/visits/{id}/complete")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<VisitResponse>> completeVisit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        VisitResponse response = visitService.completeVisit(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Visit marked as completed", response));
    }
}
