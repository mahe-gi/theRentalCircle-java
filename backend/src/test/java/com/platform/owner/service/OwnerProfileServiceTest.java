package com.platform.owner.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.CreateOwnerProfileRequest;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.OwnershipType;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import com.platform.user.repository.RoleRepository;
import com.platform.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerProfileServiceTest {

    @Mock
    private OwnerProfileRepository ownerProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private OwnerProfileService ownerProfileService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .firstName("John")
                .lastName("Doe")
                .roles(new HashSet<>())
                .build();
    }

    @Test
    @DisplayName("registerOwner successfully assigns ROLE_OWNER, creates OwnerProfile with v1.0 and timestamp")
    void testRegisterOwnerSuccess() {
        CreateOwnerProfileRequest request = CreateOwnerProfileRequest.builder()
                .ownershipType(OwnershipType.TITLE_OWNER)
                .companyName("Acme Estates")
                .declarationAccepted(true)
                .build();

        Role roleOwner = new Role(2, Role.ROLE_OWNER);
        when(ownerProfileRepository.existsByUserId(testUser.getId())).thenReturn(false);
        when(roleRepository.findByName(Role.ROLE_OWNER)).thenReturn(Optional.of(roleOwner));
        when(ownerProfileRepository.save(any(OwnerProfile.class))).thenAnswer(invocation -> {
            OwnerProfile profile = invocation.getArgument(0);
            profile.setId(10L);
            return profile;
        });

        OwnerProfileResponse response = ownerProfileService.registerOwner(testUser, request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getUserId()).isEqualTo(testUser.getId());
        assertThat(response.getOwnershipType()).isEqualTo(OwnershipType.TITLE_OWNER);
        assertThat(response.getCompanyName()).isEqualTo("Acme Estates");
        assertThat(response.isDeclarationAccepted()).isTrue();
        assertThat(response.getDeclarationVersion()).isEqualTo("v1.0");
        assertThat(response.getDeclarationAcceptedAt()).isNotNull();

        assertThat(testUser.getRoles()).contains(roleOwner);
        verify(userRepository).save(testUser);

        ArgumentCaptor<OwnerProfile> captor = ArgumentCaptor.forClass(OwnerProfile.class);
        verify(ownerProfileRepository).save(captor.capture());
        OwnerProfile saved = captor.getValue();
        assertThat(saved.getOwnershipType()).isEqualTo(OwnershipType.TITLE_OWNER);
        assertThat(saved.getDeclarationVersion()).isEqualTo("v1.0");
    }

    @Test
    @DisplayName("registerOwner throws IllegalStateException when already registered")
    void testRegisterOwnerAlreadyRegistered() {
        CreateOwnerProfileRequest request = CreateOwnerProfileRequest.builder()
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(true)
                .build();

        when(ownerProfileRepository.existsByUserId(testUser.getId())).thenReturn(true);

        assertThatThrownBy(() -> ownerProfileService.registerOwner(testUser, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already registered");

        verify(ownerProfileRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("getOwnerProfile returns response when found")
    void testGetOwnerProfileSuccess() {
        OwnerProfile profile = OwnerProfile.builder()
                .id(5L)
                .user(testUser)
                .ownershipType(OwnershipType.AUTHORIZED_REPRESENTATIVE)
                .companyName("Realty Corp")
                .declarationAccepted(true)
                .declarationAcceptedAt(Instant.now())
                .declarationVersion("v1.0")
                .build();

        when(ownerProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(profile));

        OwnerProfileResponse response = ownerProfileService.getOwnerProfile(testUser.getId());

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getOwnershipType()).isEqualTo(OwnershipType.AUTHORIZED_REPRESENTATIVE);
        assertThat(response.getCompanyName()).isEqualTo("Realty Corp");
    }

    @Test
    @DisplayName("getOwnerProfile throws ResourceNotFoundException when profile does not exist")
    void testGetOwnerProfileNotFound() {
        when(ownerProfileRepository.findByUserId(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ownerProfileService.getOwnerProfile(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Owner profile not found");
    }
}
