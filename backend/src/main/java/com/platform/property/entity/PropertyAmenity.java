package com.platform.property.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "property_amenities", uniqueConstraints = {
    @UniqueConstraint(name = "uk_property_amenities_property_amenity", columnNames = {"property_id", "amenity_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "amenityName")
public class PropertyAmenity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "amenity_name", nullable = false, length = 100)
    private String amenityName;

    public PropertyAmenity(Property property, String amenityName) {
        this.property = property;
        this.amenityName = amenityName;
    }
}
