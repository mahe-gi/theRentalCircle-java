package com.platform.admin.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.report.dto.ReportResponse;
import com.platform.report.dto.ResolveReportRequest;
import com.platform.report.entity.ReportStatus;
import com.platform.report.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReportResponse>>> listReports(
            @RequestParam(required = false) ReportStatus status,
            Pageable pageable) {
        Page<ReportResponse> response = reportService.listReports(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReportResponse>> getReport(@PathVariable Long id) {
        ReportResponse response = reportService.getReport(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/investigate")
    public ResponseEntity<ApiResponse<ReportResponse>> investigateReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ReportResponse response = reportService.investigateReport(id, principal.getUser());
        return ResponseEntity.ok(ApiResponse.success("Report under investigation", response));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<ReportResponse>> resolveReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ResolveReportRequest req) {
        ReportResponse response = reportService.resolveReport(id, principal.getUser(), req);
        return ResponseEntity.ok(ApiResponse.success("Report resolved successfully", response));
    }

    @PutMapping("/{id}/dismiss")
    public ResponseEntity<ApiResponse<ReportResponse>> dismissReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.get("notes") : null;
        ReportResponse response = reportService.dismissReport(id, principal.getUser(), notes);
        return ResponseEntity.ok(ApiResponse.success("Report dismissed", response));
    }
}
