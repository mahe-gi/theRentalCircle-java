package com.platform.favorite.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.favorite.dto.FavoriteToggleResponse;
import com.platform.favorite.service.FavoriteService;
import com.platform.search.dto.PropertySearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping("/api/v1/properties/{id}/favorite")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<FavoriteToggleResponse>> toggleFavorite(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        FavoriteToggleResponse response = favoriteService.toggleFavorite(principal.getUser(), id);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }

    @GetMapping("/api/v1/properties/{id}/favorite/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getFavoriteStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isFavorited = favoriteService.isFavorited(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("favorited", isFavorited, "isFavorited", isFavorited)));
    }

    @GetMapping("/api/v1/favorites")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<PropertySearchResult>>> getMyFavorites(
            @AuthenticationPrincipal UserPrincipal principal,
            Pageable pageable) {
        Page<PropertySearchResult> response = favoriteService.getMyFavorites(principal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
