package com.platform.property.dto;

import com.platform.property.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyDetailResponse {

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
    private Integer floorNumber;
    private Integer totalFloors;
    private String description;
    private PreferredTenant preferredTenant;
    private LocalDate availabilityDate;
    private PropertyStatus status;
    private String state;
    private String city;
    private String district;
    private String locality;
    private String address;
    private String pincode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private List<String> amenities;
    private List<PropertyImageResponse> images;
    private Instant createdAt;
    private Instant updatedAt;
    private String adminRemarks;
    private Instant reviewedAt;

    public static PropertyDetailResponse fromEntity(Property property) {
        if (property == null) {
            return null;
        }

        List<String> amenityList = property.getAmenities() != null
                ? property.getAmenities().stream()
                .map(PropertyAmenity::getAmenityName)
                .sorted()
                .collect(Collectors.toList())
                : Collections.emptyList();

        List<PropertyImageResponse> imageResponses = property.getImages() != null
                ? property.getImages().stream()
                .map(PropertyImageResponse::fromEntity)
                .collect(Collectors.toList())
                : Collections.emptyList();

        return PropertyDetailResponse.builder()
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
                .floorNumber(property.getFloorNumber())
                .totalFloors(property.getTotalFloors())
                .description(property.getDescription())
                .preferredTenant(property.getPreferredTenant())
                .availabilityDate(property.getAvailabilityDate())
                .status(property.getStatus())
                .state(property.getState())
                .city(property.getCity())
                .district(property.getDistrict())
                .locality(property.getLocality())
                .address(property.getAddress())
                .pincode(property.getPincode())
                .latitude(property.getLatitude())
                .longitude(property.getLongitude())
                .amenities(amenityList)
                .images(imageResponses)
                .createdAt(property.getCreatedAt())
                .updatedAt(property.getUpdatedAt())
                .adminRemarks(property.getAdminRemarks())
                .reviewedAt(property.getReviewedAt())
                .build();
    }
}
