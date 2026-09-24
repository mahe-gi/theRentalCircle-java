package com.platform.owner.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.CreateOwnerProfileRequest;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import com.platform.user.repository.RoleRepository;
import com.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class OwnerProfileService {

    private final OwnerProfileRepository ownerProfileRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

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
}
