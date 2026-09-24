package com.platform.owner.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.CreateOwnerProfileRequest;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.dto.OwnerVerificationStatusResponse;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.VerificationStatus;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.auth.repository.RefreshTokenRepository;
import com.platform.document.service.DocumentCleanupService;
import com.platform.property.entity.Property;
import com.platform.property.repository.PropertyRepository;
import com.platform.property.service.PropertyImageService;
import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import com.platform.user.repository.RoleRepository;
import com.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OwnerProfileService {

    private final OwnerProfileRepository ownerProfileRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DocumentCleanupService documentCleanupService;
    private final PropertyRepository propertyRepository;
    private final PropertyImageService propertyImageService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public OwnerProfileResponse registerOwner(User currentUser, CreateOwnerProfileRequest req) {
        if (ownerProfileRepository.existsByUserId(currentUser.getId())) {
            throw new IllegalStateException("User is already registered as an owner");
        }

        // Add ROLE_OWNER to user roles if not already present
        boolean hasOwnerRole = currentUser.getRoles().stream()
                .anyMatch(role -> Role.ROLE_OWNER.equals(role.getName()));

        if (!hasOwnerRole) {
            Role ownerRole = roleRepository.findByName(Role.ROLE_OWNER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.ROLE_OWNER)));
            currentUser.getRoles().add(ownerRole);
            userRepository.save(currentUser);
            log.info("Assigned ROLE_OWNER to user id: {}", currentUser.getId());
        }

        OwnerProfile profile = OwnerProfile.builder()
                .user(currentUser)
                .ownershipType(req.getOwnershipType())
                .companyName(req.getCompanyName())
                .declarationAccepted(req.getDeclarationAccepted())
                .declarationAcceptedAt(Instant.now())
                .declarationVersion("v1.0")
                .verificationStatus(VerificationStatus.NOT_STARTED)
                .build();

        OwnerProfile saved = ownerProfileRepository.save(profile);
        log.info("Created owner profile id: {} for user id: {}", saved.getId(), currentUser.getId());
        return OwnerProfileResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public OwnerProfileResponse getOwnerProfile(Long userId) {
        OwnerProfile profile = ownerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found for user ID: " + userId));
        return OwnerProfileResponse.fromEntity(profile);
    }

    @Transactional
    public OwnerProfileResponse submitForVerification(Long userId) {
        OwnerProfile profile = ownerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found for user ID: " + userId));

        long docCount = ownerProfileRepository.countDocumentsByOwnerProfileId(profile.getId());
        if (docCount == 0) {
            throw new IllegalStateException("At least one identity or address proof document must be uploaded before submitting for verification");
        }

        if (profile.getVerificationStatus() != VerificationStatus.NOT_STARTED
                && profile.getVerificationStatus() != VerificationStatus.MORE_INFORMATION_REQUIRED) {
            throw new IllegalStateException("Owner profile cannot be submitted for verification from current status: " + profile.getVerificationStatus());
        }

        profile.setVerificationStatus(VerificationStatus.SUBMITTED);
        profile.setUpdatedAt(Instant.now());
        OwnerProfile saved = ownerProfileRepository.save(profile);
        log.info("Owner profile id: {} submitted for verification", saved.getId());
        return OwnerProfileResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public OwnerVerificationStatusResponse getVerificationStatus(Long userId) {
        OwnerProfile profile = ownerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found for user ID: " + userId));
        return OwnerVerificationStatusResponse.builder()
                .verificationStatus(profile.getVerificationStatus())
                .adminRemarks(profile.getAdminRemarks())
                .verifiedAt(profile.getVerifiedAt())
                .build();
    }

    /**
     * Complete account deletion & KYC data erasure pipeline:
     * Delete owner account
     *       ↓
     * purge physical KYC files
     *       ↓
     * remove document records
     *       ↓
     * remove owner/user data
     */
    @Transactional
    public void deleteOwnerAccount(Long userId) {
        OwnerProfile profile = ownerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found for user ID: " + userId));

        Long ownerProfileId = profile.getId();

        // 1. Purge physical KYC files from disk and remove document DB records
        int purgedDocs = documentCleanupService.purgeAllDocumentsForOwnerProfile(ownerProfileId);
        log.info("Purged {} physical KYC files and records for owner profile id: {}", purgedDocs, ownerProfileId);

        // 2. Clean up property images from disk for any properties owned by this owner
        List<Property> properties = propertyRepository.findByOwnerProfileId(ownerProfileId);
        for (Property property : properties) {
            propertyImageService.deleteAllImagesForProperty(property.getId());
        }

        // 3. Revoke all refresh tokens for this user
        refreshTokenRepository.revokeAllByUserId(userId, Instant.now());

        // 4. Remove owner profile and user (cascade deletes properties, user_roles in DB)
        User user = profile.getUser();
        ownerProfileRepository.delete(profile);
        userRepository.delete(user);
        log.info("Owner account, documents, and user data id: {} permanently deleted and purged", userId);
    }
}
