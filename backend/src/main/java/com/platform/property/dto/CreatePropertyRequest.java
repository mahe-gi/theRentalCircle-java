package com.platform.property.dto;

import com.platform.property.entity.FurnishingType;
import com.platform.property.entity.ListingType;
import com.platform.property.entity.PreferredTenant;
import com.platform.property.entity.PropertyType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePropertyRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotNull(message = "Property type is required")
    private PropertyType propertyType;

    @NotNull(message = "Listing type is required")
    private ListingType listingType;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be greater than zero")
    private BigDecimal price;

    @PositiveOrZero(message = "Maintenance charges must be zero or positive")
    private BigDecimal maintenanceCharges;

    @PositiveOrZero(message = "Security deposit must be zero or positive")
    private BigDecimal securityDeposit;

    @Positive(message = "BHK must be greater than zero")
    private Integer bhk;

    @Positive(message = "Bedrooms must be greater than zero")
    private Integer bedrooms;

    @Positive(message = "Bathrooms must be greater than zero")
    private Integer bathrooms;

    @Positive(message = "Carpet area must be greater than zero")
    private BigDecimal carpetArea;

    @Positive(message = "Built up area must be greater than zero")
    private BigDecimal builtUpArea;

    private FurnishingType furnishing;

    private Integer floorNumber;

    @Positive(message = "Total floors must be positive")
    private Integer totalFloors;

    private String description;

    private PreferredTenant preferredTenant;

    private LocalDate availabilityDate;

    @NotBlank(message = "State is required")
    @Size(max = 100, message = "State must not exceed 100 characters")
    private String state;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @NotBlank(message = "District is required")
    @Size(max = 100, message = "District must not exceed 100 characters")
    private String district;

    @NotBlank(message = "Locality is required")
    @Size(max = 255, message = "Locality must not exceed 255 characters")
    private String locality;

    @NotBlank(message = "Address is required")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    @NotBlank(message = "Pincode is required")
    @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Pincode must be a valid 6-digit Indian PIN code")
    private String pincode;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private List<String> amenities;
}
