package com.platform.property.dto;

import com.platform.property.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyResponse {

    private Long id;
    private Long ownerProfileId;
    private String title;
    private PropertyType propertyType;
    private ListingType listingType;
    private BigDecimal price;
    private BigDecimal maintenanceCharges;
    private BigDecimal securityDeposit;
    private Integer bhk;
    private Integer bedrooms;
    private Integer bathrooms;
    private BigDecimal carpetArea;
    private BigDecimal builtUpArea;
    private FurnishingType furnishing;
    private PropertyStatus status;
    private String state;
    private String city;
    private String district;
    private String locality;
    private String address;
    private String pincode;
    private String primaryImageStorageKey;
    private List<String> amenities;
    private Instant createdAt;
    private Instant updatedAt;

    public static PropertyResponse fromEntity(Property property) {
        if (property == null) {
            return null;
        }

        String primaryStorageKey = null;
        if (property.getImages() != null && !property.getImages().isEmpty()) {
            primaryStorageKey = property.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .map(PropertyImage::getStorageKey)
                    .findFirst()
                    .orElse(property.getImages().getFirst().getStorageKey());
        }

        List<String> amenityList = null;
        if (property.getAmenities() != null) {
            amenityList = property.getAmenities().stream()
                    .map(PropertyAmenity::getAmenityName)
                    .sorted()
                    .collect(Collectors.toList());
        }

        return PropertyResponse.builder()
                .id(property.getId())
                .ownerProfileId(property.getOwnerProfile() != null ? property.getOwnerProfile().getId() : null)
                .title(property.getTitle())
                .propertyType(property.getPropertyType())
                .listingType(property.getListingType())
                .price(property.getPrice())
                .maintenanceCharges(property.getMaintenanceCharges())
                .securityDeposit(property.getSecurityDeposit())
                .bhk(property.getBhk())
                .bedrooms(property.getBedrooms())
                .bathrooms(property.getBathrooms())
                .carpetArea(property.getCarpetArea())
                .builtUpArea(property.getBuiltUpArea())
                .furnishing(property.getFurnishing())
                .status(property.getStatus())
                .state(property.getState())
                .city(property.getCity())
                .district(property.getDistrict())
                .locality(property.getLocality())
                .address(property.getAddress())
                .pincode(property.getPincode())
                .primaryImageStorageKey(primaryStorageKey)
                .amenities(amenityList)
                .createdAt(property.getCreatedAt())
                .updatedAt(property.getUpdatedAt())
                .build();
    }
}
