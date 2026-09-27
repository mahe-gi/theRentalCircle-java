package com.platform.admin.controller;

import com.platform.admin.dto.AdminActionResponse;
import com.platform.admin.repository.AdminActionRepository;
import com.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditController {

    private final AdminActionRepository adminActionRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminActionResponse>>> getAuditLogs(Pageable pageable) {
        Page<AdminActionResponse> logs = adminActionRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(AdminActionResponse::fromEntity);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
