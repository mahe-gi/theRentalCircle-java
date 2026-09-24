package com.platform.document.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.common.exception.UnauthorizedException;
import com.platform.document.dto.DocumentResponse;
import com.platform.document.dto.DownloadResource;
import com.platform.document.entity.DocumentType;
import com.platform.document.service.DocumentStorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentStorageService documentStorageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") DocumentType documentType,
            @RequestParam(value = "propertyId", required = false) Long propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }

        DocumentResponse response = documentStorageService.uploadDocument(file, documentType, propertyId, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Document uploaded successfully", response));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request) {

        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }

        boolean isAdmin = principal.getAuthorities() != null && principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        } else {
            clientIp = clientIp.split(",")[0].trim();
        }

        DownloadResource downloadResource = documentStorageService.getDownloadResource(
                id, principal.getId(), isAdmin, clientIp
        );

        String sanitizedFilename = sanitizeFilename(downloadResource.originalFilename());

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitizedFilename + "\"")
                .contentType(MediaType.parseMediaType(downloadResource.contentType()))
                .body(downloadResource.resource());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getMyDocuments(
            @AuthenticationPrincipal UserPrincipal principal) {

        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }

        List<DocumentResponse> response = documentStorageService.getOwnerDocuments(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Owner documents retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }

        documentStorageService.deleteDocument(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "document";
        }
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
