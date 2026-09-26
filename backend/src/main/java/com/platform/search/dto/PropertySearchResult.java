package com.platform.search.dto;

import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyAmenity;
import com.platform.property.entity.PropertyImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertySearchResult {

    private Long id;
    private String title;
    private String listingType;
    private String propertyType;
    private BigDecimal price;
    private BigDecimal maintenanceCharges;
    private Integer bhk;
    private Integer bedrooms;
    private Integer bathrooms;
    private BigDecimal carpetArea;
    private String furnishing;
    private String city;
    private String district;
    private String locality;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String primaryImageUrl;
    private List<String> amenities;
    private LocalDate availabilityDate;
    private Instant createdAt;

    public static PropertySearchResult fromEntity(Property property) {
        if (property == null) {
            return null;
        }

        String primaryImageUrl = null;
        if (property.getImages() != null && !property.getImages().isEmpty()) {
            primaryImageUrl = property.getImages().stream()
                    .filter(PropertyImage::isPrimary)
                    .findFirst()
                    .or(() -> property.getImages().stream()
                            .min(Comparator.comparingInt(PropertyImage::getDisplayOrder)))
                    .map(img -> "/uploads/" + img.getStorageKey())
                    .orElse(null);
        }

        List<String> amenityList = property.getAmenities() != null
                ? property.getAmenities().stream()
                .map(PropertyAmenity::getAmenityName)
                .sorted()
                .collect(Collectors.toList())
                : Collections.emptyList();

        return PropertySearchResult.builder()
                .id(property.getId())
                .title(property.getTitle())
                .listingType(property.getListingType() != null ? property.getListingType().name() : null)
                .propertyType(property.getPropertyType() != null ? property.getPropertyType().name() : null)
                .price(property.getPrice())
                .maintenanceCharges(property.getMaintenanceCharges())
                .bhk(property.getBhk())
                .bedrooms(property.getBedrooms())
                .bathrooms(property.getBathrooms())
                .carpetArea(property.getCarpetArea())
                .furnishing(property.getFurnishing() != null ? property.getFurnishing().name() : null)
                .city(property.getCity())
                .district(property.getDistrict())
                .locality(property.getLocality())
                .latitude(property.getLatitude())
                .longitude(property.getLongitude())
                .primaryImageUrl(primaryImageUrl)
                .amenities(amenityList)
                .availabilityDate(property.getAvailabilityDate())
                .createdAt(property.getCreatedAt())
                .build();
    }
}
