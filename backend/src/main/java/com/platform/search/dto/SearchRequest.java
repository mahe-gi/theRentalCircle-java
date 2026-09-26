package com.platform.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequest {

    private String listingType;
    private String propertyType;
    private String city;
    private String district;
    private String locality;
    private Long minPrice;
    private Long maxPrice;
    private List<Integer> bhk;
    private String furnishing;
    private List<String> amenities;
    private BigDecimal minArea;
    private BigDecimal maxArea;
    private BigDecimal minLat;
    private BigDecimal maxLat;
    private BigDecimal minLng;
    private BigDecimal maxLng;
    
    @Builder.Default
    private String sort = "NEWEST";
}
