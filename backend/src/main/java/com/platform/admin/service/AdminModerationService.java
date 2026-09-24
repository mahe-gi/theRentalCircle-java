package com.platform.admin.service;

import com.platform.admin.entity.AdminAction;
import com.platform.admin.repository.AdminActionRepository;
import com.platform.common.exception.ConflictException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.VerificationStatus;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.property.dto.PropertyDetailResponse;
import com.platform.property.dto.PropertyResponse;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private final OwnerProfileRepository ownerProfileRepository;
    private final PropertyRepository propertyRepository;
    private final AdminActionRepository adminActionRepository;

    /**
     * Common engine: attemptTransitionToLive(Property property)
     * Invariant: property.status == APPROVED && owner.verificationStatus == VERIFIED
     * If both true, transitions to LIVE.
     */
    public boolean attemptTransitionToLive(Property property) {
        if (property == null || property.getOwnerProfile() == null) {
            return false;
        }

        if (property.getStatus() == PropertyStatus.APPROVED
                && property.getOwnerProfile().getVerificationStatus() == VerificationStatus.VERIFIED) {
            property.setStatus(PropertyStatus.LIVE);
            property.setUpdatedAt(Instant.now());
            propertyRepository.save(property);
            log.info("Invariant satisfied: property id: {} transitioned to LIVE", property.getId());
            return true;
        }

        return false;
    }

    @Transactional
    public OwnerProfileResponse verifyOwner(Long ownerProfileId, User admin, String remarks) {
        int rowsAffected = ownerProfileRepository.updateVerificationStatusIfInReview(
                ownerProfileId, VerificationStatus.VERIFIED, admin, Instant.now(), remarks);

        if (rowsAffected == 0) {
            throw new ConflictException("Owner verification has already been processed or is not in review");
        }

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("VERIFY_OWNER")
                .targetType("OWNER")
                .targetId(ownerProfileId)
                .details(remarks)
                .build());

        OwnerProfile ownerProfile = ownerProfileRepository.findById(ownerProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found with ID: " + ownerProfileId));

        List<Property> approvedProperties = propertyRepository.findByOwnerProfileIdAndStatus(ownerProfileId, PropertyStatus.APPROVED);
        for (Property property : approvedProperties) {
            property.setOwnerProfile(ownerProfile);
            attemptTransitionToLive(property);
        }

        return OwnerProfileResponse.fromEntity(ownerProfile);
    }

    @Transactional
    public OwnerProfileResponse rejectOwner(Long ownerProfileId, User admin, String remarks) {
        int rowsAffected = ownerProfileRepository.updateVerificationStatusIfInReview(
                ownerProfileId, VerificationStatus.REJECTED, admin, Instant.now(), remarks);

        if (rowsAffected == 0) {
            throw new ConflictException("Owner verification has already been processed or is not in review");
        }

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("REJECT_OWNER")
                .targetType("OWNER")
                .targetId(ownerProfileId)
                .details(remarks)
                .build());

        List<Property> liveProperties = propertyRepository.findByOwnerProfileIdAndStatus(ownerProfileId, PropertyStatus.LIVE);
        for (Property property : liveProperties) {
            property.setStatus(PropertyStatus.SUSPENDED);
            property.setUpdatedAt(Instant.now());
            propertyRepository.save(property);
            log.info("Cascaded property id: {} to SUSPENDED due to owner rejection", property.getId());
        }

        OwnerProfile ownerProfile = ownerProfileRepository.findById(ownerProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found with ID: " + ownerProfileId));
        return OwnerProfileResponse.fromEntity(ownerProfile);
    }

    @Transactional
    public OwnerProfileResponse requestMoreInfoOwner(Long ownerProfileId, User admin, String remarks) {
        int rowsAffected = ownerProfileRepository.updateVerificationStatusIfInReview(
                ownerProfileId, VerificationStatus.MORE_INFORMATION_REQUIRED, admin, Instant.now(), remarks);

        if (rowsAffected == 0) {
            throw new ConflictException("Owner verification has already been processed or is not in review");
        }

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("REQUEST_MORE_INFO_OWNER")
                .targetType("OWNER")
                .targetId(ownerProfileId)
                .details(remarks)
                .build());

        OwnerProfile ownerProfile = ownerProfileRepository.findById(ownerProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found with ID: " + ownerProfileId));
        return OwnerProfileResponse.fromEntity(ownerProfile);
    }

    @Transactional
    public PropertyResponse approveProperty(Long propertyId, User admin, String remarks) {
        int rowsAffected = propertyRepository.updatePropertyStatusIfInReview(
                propertyId, PropertyStatus.APPROVED, admin, Instant.now(), remarks);

        if (rowsAffected == 0) {
            throw new ConflictException("Property moderation has already been processed or is not in review");
        }

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("APPROVE_PROPERTY")
                .targetType("PROPERTY")
                .targetId(propertyId)
                .details(remarks)
                .build());

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));

        property.setStatus(PropertyStatus.APPROVED);
        property.setReviewedBy(admin);
        property.setAdminRemarks(remarks);

        attemptTransitionToLive(property);
        return PropertyResponse.fromEntity(property);
    }

    @Transactional
    public PropertyResponse rejectProperty(Long propertyId, User admin, String remarks) {
        int rowsAffected = propertyRepository.updatePropertyStatusIfInReview(
                propertyId, PropertyStatus.REJECTED, admin, Instant.now(), remarks);

        if (rowsAffected == 0) {
            throw new ConflictException("Property moderation has already been processed or is not in review");
        }

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("REJECT_PROPERTY")
                .targetType("PROPERTY")
                .targetId(propertyId)
                .details(remarks)
                .build());

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));

        property.setStatus(PropertyStatus.REJECTED);
        property.setReviewedBy(admin);
        property.setAdminRemarks(remarks);

        return PropertyResponse.fromEntity(property);
    }

    @Transactional
    public PropertyResponse requestMoreInfoProperty(Long propertyId, User admin, String remarks) {
        int rowsAffected = propertyRepository.updatePropertyStatusIfInReview(
                propertyId, PropertyStatus.MORE_INFORMATION_REQUIRED, admin, Instant.now(), remarks);

        if (rowsAffected == 0) {
            throw new ConflictException("Property moderation has already been processed or is not in review");
        }

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("REQUEST_MORE_INFO_PROPERTY")
                .targetType("PROPERTY")
                .targetId(propertyId)
                .details(remarks)
                .build());

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + propertyId));

        property.setStatus(PropertyStatus.MORE_INFORMATION_REQUIRED);
        property.setReviewedBy(admin);
        property.setAdminRemarks(remarks);

        return PropertyResponse.fromEntity(property);
    }

    @Transactional(readOnly = true)
    public Page<OwnerProfileResponse> listOwners(VerificationStatus status, Pageable pageable) {
        Page<OwnerProfile> page = (status != null)
                ? ownerProfileRepository.findAllByVerificationStatus(status, pageable)
                : ownerProfileRepository.findAll(pageable);
        return page.map(OwnerProfileResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public OwnerProfileResponse getOwner(Long id) {
        OwnerProfile profile = ownerProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found with ID: " + id));
        return OwnerProfileResponse.fromEntity(profile);
    }

    @Transactional(readOnly = true)
    public Page<PropertyResponse> listProperties(PropertyStatus status, Pageable pageable) {
        Page<Property> page = (status != null)
                ? propertyRepository.findAllByStatus(status, pageable)
                : propertyRepository.findAll(pageable);
        return page.map(PropertyResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PropertyDetailResponse getProperty(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with ID: " + id));
        return PropertyDetailResponse.fromEntity(property);
    }
}
