package com.platform.property.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.property.dto.*;
import com.platform.property.entity.*;
import com.platform.property.repository.PropertyAmenityRepository;
import com.platform.property.repository.PropertyImageRepository;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyAmenityRepository propertyAmenityRepository;
    private final PropertyImageRepository propertyImageRepository;
    private final OwnerProfileRepository ownerProfileRepository;

    @Transactional
    public PropertyDetailResponse createDraft(User user, CreatePropertyRequest req) {
        OwnerProfile ownerProfile = ownerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found for user ID: " + user.getId() + ". Please register as an owner first."));

        Property property = Property.builder()
                .ownerProfile(ownerProfile)
                .title(req.getTitle())
                .propertyType(req.getPropertyType())
                .listingType(req.getListingType())
                .price(req.getPrice())
                .maintenanceCharges(req.getMaintenanceCharges() != null ? req.getMaintenanceCharges() : BigDecimal.ZERO)
                .securityDeposit(req.getSecurityDeposit() != null ? req.getSecurityDeposit() : BigDecimal.ZERO)
                .bhk(req.getBhk())
                .bedrooms(req.getBedrooms())
                .bathrooms(req.getBathrooms())
                .carpetArea(req.getCarpetArea())
                .builtUpArea(req.getBuiltUpArea())
                .furnishing(req.getFurnishing())
                .floorNumber(req.getFloorNumber())
                .totalFloors(req.getTotalFloors())
                .description(req.getDescription())
                .preferredTenant(req.getPreferredTenant() != null ? req.getPreferredTenant() : PreferredTenant.ANY)
                .availabilityDate(req.getAvailabilityDate())
                .status(PropertyStatus.DRAFT)
                .state(req.getState())
                .city(req.getCity())
                .district(req.getDistrict())
                .locality(req.getLocality())
                .address(req.getAddress())
                .pincode(req.getPincode())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .build();

        if (req.getAmenities() != null && !req.getAmenities().isEmpty()) {
            req.getAmenities().forEach(property::addAmenity);
        }

        Property saved = propertyRepository.save(property);
        log.info("Created property draft id: {} for owner profile id: {}", saved.getId(), ownerProfile.getId());
        return PropertyDetailResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public PropertyDetailResponse getOwnerProperty(Long propertyId, Long userId) {
        Property property = propertyRepository.findByIdAndOwnerProfileUserId(propertyId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));
        return PropertyDetailResponse.fromEntity(property);
    }

    @Transactional
    public PropertyDetailResponse updateDraft(Long propertyId, Long userId, UpdatePropertyRequest req) {
        Property property = propertyRepository.findByIdAndOwnerProfileUserId(propertyId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));

        if (property.getStatus() != PropertyStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT properties can be updated");
        }

        if (StringUtils.hasText(req.getTitle())) {
            property.setTitle(req.getTitle());
        }
        if (req.getPropertyType() != null) {
            property.setPropertyType(req.getPropertyType());
        }
        if (req.getListingType() != null) {
            property.setListingType(req.getListingType());
        }
        if (req.getPrice() != null) {
            property.setPrice(req.getPrice());
        }
        if (req.getMaintenanceCharges() != null) {
            property.setMaintenanceCharges(req.getMaintenanceCharges());
        }
        if (req.getSecurityDeposit() != null) {
            property.setSecurityDeposit(req.getSecurityDeposit());
        }
        if (req.getBhk() != null) {
            property.setBhk(req.getBhk());
        }
        if (req.getBedrooms() != null) {
            property.setBedrooms(req.getBedrooms());
        }
        if (req.getBathrooms() != null) {
            property.setBathrooms(req.getBathrooms());
        }
        if (req.getCarpetArea() != null) {
            property.setCarpetArea(req.getCarpetArea());
        }
        if (req.getBuiltUpArea() != null) {
            property.setBuiltUpArea(req.getBuiltUpArea());
        }
        if (req.getFurnishing() != null) {
            property.setFurnishing(req.getFurnishing());
        }
        if (req.getFloorNumber() != null) {
            property.setFloorNumber(req.getFloorNumber());
        }
        if (req.getTotalFloors() != null) {
            property.setTotalFloors(req.getTotalFloors());
        }
        if (req.getDescription() != null) {
            property.setDescription(req.getDescription());
        }
        if (req.getPreferredTenant() != null) {
            property.setPreferredTenant(req.getPreferredTenant());
        }
        if (req.getAvailabilityDate() != null) {
            property.setAvailabilityDate(req.getAvailabilityDate());
        }
        if (StringUtils.hasText(req.getState())) {
            property.setState(req.getState());
        }
        if (StringUtils.hasText(req.getCity())) {
            property.setCity(req.getCity());
        }
        if (StringUtils.hasText(req.getDistrict())) {
            property.setDistrict(req.getDistrict());
        }
        if (StringUtils.hasText(req.getLocality())) {
            property.setLocality(req.getLocality());
        }
        if (StringUtils.hasText(req.getAddress())) {
            property.setAddress(req.getAddress());
        }
        if (StringUtils.hasText(req.getPincode())) {
            property.setPincode(req.getPincode());
        }
        if (req.getLatitude() != null) {
            property.setLatitude(req.getLatitude());
        }
        if (req.getLongitude() != null) {
            property.setLongitude(req.getLongitude());
        }

        if (req.getAmenities() != null) {
            property.setAmenities(req.getAmenities());
        }

        Property updated = propertyRepository.save(property);
        log.info("Updated draft property id: {} for user id: {}", updated.getId(), userId);
        return PropertyDetailResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteProperty(Long propertyId, Long userId) {
        Property property = propertyRepository.findByIdAndOwnerProfileUserId(propertyId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));

        if (property.getStatus() != PropertyStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT properties can be deleted");
        }

        propertyRepository.delete(property);
        log.info("Deleted draft property id: {} for user id: {}", propertyId, userId);
    }

    @Transactional
    public PropertyDetailResponse submitProperty(Long propertyId, Long userId) {
        Property property = propertyRepository.findByIdAndOwnerProfileUserId(propertyId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));

        if (property.getStatus() != PropertyStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT properties can be submitted for review");
        }

        validateSubmissionRequirements(property);

        boolean hasImage = propertyImageRepository.existsByPropertyId(property.getId())
                || (property.getImages() != null && !property.getImages().isEmpty());

        if (!hasImage) {
            throw new IllegalStateException("Property must have at least one image before submission");
        }

        property.setStatus(PropertyStatus.SUBMITTED);
        Property saved = propertyRepository.save(property);
        log.info("Submitted property id: {} for review by user id: {}", saved.getId(), userId);
        return PropertyDetailResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> listOwnerProperties(Long userId, String status, Pageable pageable) {
        Page<Property> page;
        if (StringUtils.hasText(status)) {
            page = propertyRepository.findAllByOwnerProfileUserIdAndStatus(userId, status.trim().toUpperCase(), pageable);
        } else {
            page = propertyRepository.findAllByOwnerProfileUserId(userId, pageable);
        }
        return page.map(PropertyResponse::fromEntity);
    }

    private void validateSubmissionRequirements(Property property) {
        if (!StringUtils.hasText(property.getTitle())) {
            throw new IllegalStateException("Property title is required for submission");
        }
        if (property.getPropertyType() == null) {
            throw new IllegalStateException("Property type is required for submission");
        }
        if (property.getListingType() == null) {
            throw new IllegalStateException("Listing type is required for submission");
        }
        if (property.getPrice() == null || property.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Valid property price is required for submission");
        }
        if (!StringUtils.hasText(property.getState())) {
            throw new IllegalStateException("Property state is required for submission");
        }
        if (!StringUtils.hasText(property.getCity())) {
            throw new IllegalStateException("Property city is required for submission");
        }
        if (!StringUtils.hasText(property.getDistrict())) {
            throw new IllegalStateException("Property district is required for submission");
        }
        if (!StringUtils.hasText(property.getLocality())) {
            throw new IllegalStateException("Property locality is required for submission");
        }
        if (!StringUtils.hasText(property.getAddress())) {
            throw new IllegalStateException("Property address is required for submission");
        }
        if (!StringUtils.hasText(property.getPincode())) {
            throw new IllegalStateException("Property pincode is required for submission");
        }
    }
}
