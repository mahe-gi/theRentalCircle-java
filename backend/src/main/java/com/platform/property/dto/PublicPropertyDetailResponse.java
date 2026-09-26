package com.platform.property.dto;

import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.VerificationStatus;
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
public class PublicPropertyDetailResponse {

    private Long id;
    private String title;
    private String listingType;
    private String propertyType;
    private BigDecimal price;
    private BigDecimal maintenanceCharges;
    private BigDecimal securityDeposit;
    private Integer bhk;
    private Integer bedrooms;
    private Integer bathrooms;
    private BigDecimal carpetArea;
    private BigDecimal builtUpArea;
    private String furnishing;
    private Integer floorNumber;
    private Integer totalFloors;
    private String description;
    private String preferredTenant;
    private LocalDate availabilityDate;
    private String state;
    private String city;
    private String district;
    private String locality;
    private String pincode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private List<String> amenities;
    private List<PublicPropertyImageDto> images;
    private OwnerSummary owner;
    private Instant createdAt;

    public record PublicPropertyImageDto(Long id, String url, Integer displayOrder, boolean isPrimary) {}

    public record OwnerSummary(String ownershipType, boolean verifiedBadge) {}

    public static PublicPropertyDetailResponse fromEntity(Property property) {
        if (property == null) {
            return null;
        }

        List<String> amenityList = property.getAmenities() != null
                ? property.getAmenities().stream()
                .map(PropertyAmenity::getAmenityName)
                .sorted()
                .collect(Collectors.toList())
                : Collections.emptyList();

        List<PublicPropertyImageDto> imageDtos = property.getImages() != null
                ? property.getImages().stream()
                .map(img -> new PublicPropertyImageDto(
                        img.getId(),
                        "/uploads/" + img.getStorageKey(),
                        img.getDisplayOrder(),
                        Boolean.TRUE.equals(img.getIsPrimary())
                ))
                .collect(Collectors.toList())
                : Collections.emptyList();

        OwnerSummary ownerSummary = null;
        if (property.getOwnerProfile() != null) {
            OwnerProfile op = property.getOwnerProfile();
            boolean verified = op.getVerificationStatus() == VerificationStatus.VERIFIED;
            String oType = op.getOwnershipType() != null ? op.getOwnershipType().name() : null;
            ownerSummary = new OwnerSummary(oType, verified);
        }

        return PublicPropertyDetailResponse.builder()
                .id(property.getId())
                .title(property.getTitle())
                .listingType(property.getListingType() != null ? property.getListingType().name() : null)
                .propertyType(property.getPropertyType() != null ? property.getPropertyType().name() : null)
                .price(property.getPrice())
                .maintenanceCharges(property.getMaintenanceCharges())
                .securityDeposit(property.getSecurityDeposit())
                .bhk(property.getBhk())
                .bedrooms(property.getBedrooms())
                .bathrooms(property.getBathrooms())
                .carpetArea(property.getCarpetArea())
                .builtUpArea(property.getBuiltUpArea())
                .furnishing(property.getFurnishing() != null ? property.getFurnishing().name() : null)
                .floorNumber(property.getFloorNumber())
                .totalFloors(property.getTotalFloors())
                .description(property.getDescription())
                .preferredTenant(property.getPreferredTenant() != null ? property.getPreferredTenant().name() : null)
                .availabilityDate(property.getAvailabilityDate())
                .state(property.getState())
                .city(property.getCity())
                .district(property.getDistrict())
                .locality(property.getLocality())
                .pincode(property.getPincode())
                .latitude(property.getLatitude())
                .longitude(property.getLongitude())
                .amenities(amenityList)
                .images(imageDtos)
                .owner(ownerSummary)
                .createdAt(property.getCreatedAt())
                .build();
    }
}
