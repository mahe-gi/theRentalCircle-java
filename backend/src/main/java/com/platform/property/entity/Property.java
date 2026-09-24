package com.platform.property.entity;

import com.platform.owner.entity.OwnerProfile;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "properties")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_profile_id", nullable = false)
    private OwnerProfile ownerProfile;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false, length = 32)
    private PropertyType propertyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_type", nullable = false, length = 32)
    private ListingType listingType;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "maintenance_charges", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal maintenanceCharges = BigDecimal.ZERO;

    @Column(name = "security_deposit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal securityDeposit = BigDecimal.ZERO;

    private Integer bhk;

    private Integer bedrooms;

    private Integer bathrooms;

    @Column(name = "carpet_area", precision = 10, scale = 2)
    private BigDecimal carpetArea;

    @Column(name = "built_up_area", precision = 10, scale = 2)
    private BigDecimal builtUpArea;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private FurnishingType furnishing;

    @Column(name = "floor_number")
    private Integer floorNumber;

    @Column(name = "total_floors")
    private Integer totalFloors;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_tenant", length = 32)
    @Builder.Default
    private PreferredTenant preferredTenant = PreferredTenant.ANY;

    @Column(name = "availability_date")
    private LocalDate availabilityDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private PropertyStatus status = PropertyStatus.DRAFT;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 255)
    private String locality;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(nullable = false, length = 10)
    private String pincode;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<PropertyAmenity> amenities = new HashSet<>();

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<PropertyImage> images = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (status == null) {
            status = PropertyStatus.DRAFT;
        }
        if (preferredTenant == null) {
            preferredTenant = PreferredTenant.ANY;
        }
        if (maintenanceCharges == null) {
            maintenanceCharges = BigDecimal.ZERO;
        }
        if (securityDeposit == null) {
            securityDeposit = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public void addAmenity(String amenityName) {
        if (amenityName != null && !amenityName.trim().isEmpty()) {
            String trimmed = amenityName.trim();
            boolean exists = this.amenities.stream()
                    .anyMatch(a -> a.getAmenityName().equalsIgnoreCase(trimmed));
            if (!exists) {
                this.amenities.add(new PropertyAmenity(this, trimmed));
            }
        }
    }

    public void setAmenities(Collection<String> newAmenityNames) {
        if (newAmenityNames == null) {
            this.amenities.clear();
            return;
        }
        Set<String> normalized = new HashSet<>();
        for (String name : newAmenityNames) {
            if (name != null && !name.trim().isEmpty()) {
                normalized.add(name.trim());
            }
        }

        // Remove amenities no longer present in new set
        this.amenities.removeIf(a -> normalized.stream()
                .noneMatch(n -> n.equalsIgnoreCase(a.getAmenityName())));

        // Add only new amenities not already present
        for (String name : normalized) {
            boolean alreadyPresent = this.amenities.stream()
                    .anyMatch(a -> a.getAmenityName().equalsIgnoreCase(name));
            if (!alreadyPresent) {
                this.amenities.add(new PropertyAmenity(this, name));
            }
        }
    }

    public void clearAmenities() {
        this.amenities.clear();
    }
}
