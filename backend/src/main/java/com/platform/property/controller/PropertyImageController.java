package com.platform.property.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.common.exception.UnauthorizedException;
import com.platform.property.dto.PropertyImageResponse;
import com.platform.property.service.PropertyImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequestMapping("/api/v1/properties")
@RequiredArgsConstructor
public class PropertyImageController {

    private final PropertyImageService propertyImageService;

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PropertyImageResponse>> uploadImage(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        PropertyImageResponse response = propertyImageService.uploadImage(id, file, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Image uploaded successfully", response));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable("id") Long id,
            @PathVariable("imageId") Long imageId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        propertyImageService.deleteImage(id, imageId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Image deleted successfully", null));
    }

    @PutMapping("/{id}/images/{imageId}/primary")
    public ResponseEntity<ApiResponse<PropertyImageResponse>> setPrimaryImage(
            @PathVariable("id") Long id,
            @PathVariable("imageId") Long imageId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        PropertyImageResponse response = propertyImageService.setPrimary(id, imageId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Primary image set successfully", response));
    }

    @GetMapping("/{id}/images")
    public ResponseEntity<ApiResponse<List<PropertyImageResponse>>> getImages(
            @PathVariable("id") Long id) {
        List<PropertyImageResponse> images = propertyImageService.getImagesForProperty(id);
        return ResponseEntity.ok(ApiResponse.success(images));
    }
}
