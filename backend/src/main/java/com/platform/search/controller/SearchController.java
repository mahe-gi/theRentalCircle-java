package com.platform.search.controller;

import com.platform.common.dto.ApiResponse;
import com.platform.search.dto.LocationSuggestionsResponse;
import com.platform.search.dto.PropertySearchResult;
import com.platform.search.dto.SearchRequest;
import com.platform.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/properties")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<PropertySearchResult>>> search(
            @ModelAttribute SearchRequest req,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (size > 50) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Page size cannot exceed 50"));
        }

        Page<PropertySearchResult> results = searchService.search(req, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success("Search completed successfully", results));
    }

    @GetMapping("/search/locations")
    public ResponseEntity<ApiResponse<LocationSuggestionsResponse>> locations(
            @RequestParam String query,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String city) {

        if (query == null || query.trim().length() < 2) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Query parameter must be at least 2 characters"));
        }

        LocationSuggestionsResponse suggestions = searchService.suggestLocations(query, type, city);
        return ResponseEntity.ok(ApiResponse.success("Location suggestions retrieved successfully", suggestions));
    }
}
