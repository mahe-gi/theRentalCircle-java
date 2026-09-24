package com.platform.admin.service;

import com.platform.common.exception.ConflictException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.OwnershipType;
import com.platform.owner.entity.VerificationStatus;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.property.dto.PropertyDetailResponse;
import com.platform.property.dto.PropertyResponse;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.platform.admin.entity.AdminAction;
import com.platform.admin.repository.AdminActionRepository;
import com.platform.owner.service.OwnerProfileService;

@ExtendWith(MockitoExtension.class)
class AdminModerationServiceTest {

    @Mock
    private OwnerProfileRepository ownerProfileRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private AdminActionRepository adminActionRepository;

    @Mock
    private OwnerProfileService ownerProfileService;

    @InjectMocks
    private AdminModerationService adminModerationService;

    private User adminUser;
    private OwnerProfile testOwnerProfile;
    private Property testProperty;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(99L)
                .email("admin@platform.com")
                .firstName("Admin")
                .lastName("User")
                .build();

        testOwnerProfile = OwnerProfile.builder()
                .id(1L)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .companyName("Test Company")
                .declarationAccepted(true)
                .declarationAcceptedAt(Instant.now())
                .declarationVersion("v1.0")
                .verificationStatus(VerificationStatus.SUBMITTED)
                .build();

        testProperty = Property.builder()
                .id(10L)
                .ownerProfile(testOwnerProfile)
                .title("Luxury Villa")
                .price(new BigDecimal("25000.00"))
                .status(PropertyStatus.SUBMITTED)
                .state("Telangana")
                .city("Hyderabad")
                .district("Rangareddy")
                .locality("Gachibowli")
                .address("Plot 123, Financial District")
                .pincode("500032")
                .build();
    }

    // --- attemptTransitionToLive tests ---

    @Test
    @DisplayName("attemptTransitionToLive transitions property to LIVE when APPROVED and owner is VERIFIED")
    void testAttemptTransitionToLiveSuccess() {
        testOwnerProfile.setVerificationStatus(VerificationStatus.VERIFIED);
        testProperty.setStatus(PropertyStatus.APPROVED);

        boolean transitioned = adminModerationService.attemptTransitionToLive(testProperty);

        assertThat(transitioned).isTrue();
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.LIVE);
        verify(propertyRepository).save(testProperty);
    }

    @Test
    @DisplayName("attemptTransitionToLive does not transition to LIVE when property is APPROVED but owner is SUBMITTED")
    void testAttemptTransitionToLiveOwnerNotVerified() {
        testOwnerProfile.setVerificationStatus(VerificationStatus.SUBMITTED);
        testProperty.setStatus(PropertyStatus.APPROVED);

        boolean transitioned = adminModerationService.attemptTransitionToLive(testProperty);

        assertThat(transitioned).isFalse();
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.APPROVED);
        verify(propertyRepository, never()).save(testProperty);
    }

    @Test
    @DisplayName("attemptTransitionToLive does not transition to LIVE when property is DRAFT even if owner is VERIFIED")
    void testAttemptTransitionToLivePropertyDraft() {
        testOwnerProfile.setVerificationStatus(VerificationStatus.VERIFIED);
        testProperty.setStatus(PropertyStatus.DRAFT);

        boolean transitioned = adminModerationService.attemptTransitionToLive(testProperty);

        assertThat(transitioned).isFalse();
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.DRAFT);
        verify(propertyRepository, never()).save(testProperty);
    }

    @Test
    @DisplayName("attemptTransitionToLive handles null property safely")
    void testAttemptTransitionToLiveNullProperty() {
        boolean transitioned = adminModerationService.attemptTransitionToLive(null);
        assertThat(transitioned).isFalse();
    }

    // --- Owner Moderation Actions ---

    @Test
    @DisplayName("verifyOwner succeeds and transitions APPROVED properties to LIVE")
    void testVerifyOwnerSuccessWithApprovedProperties() {
        when(ownerProfileRepository.updateVerificationStatusIfInReview(
                eq(1L), eq(VerificationStatus.VERIFIED), eq(adminUser), any(Instant.class), eq("Documents verified")))
                .thenReturn(1);

        testOwnerProfile.setVerificationStatus(VerificationStatus.VERIFIED);
        testOwnerProfile.setVerifiedBy(adminUser);
        testOwnerProfile.setVerifiedAt(Instant.now());
        testOwnerProfile.setAdminRemarks("Documents verified");
        when(ownerProfileRepository.findById(1L)).thenReturn(Optional.of(testOwnerProfile));

        Property approvedProperty = Property.builder()
                .id(20L)
                .ownerProfile(testOwnerProfile)
                .title("Modern Apartment")
                .status(PropertyStatus.APPROVED)
                .build();

        when(propertyRepository.findByOwnerProfileIdAndStatus(1L, PropertyStatus.APPROVED))
                .thenReturn(List.of(approvedProperty));

        OwnerProfileResponse response = adminModerationService.verifyOwner(1L, adminUser, "Documents verified");

        assertThat(response).isNotNull();
        assertThat(response.getVerificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(approvedProperty.getStatus()).isEqualTo(PropertyStatus.LIVE);
        verify(propertyRepository).save(approvedProperty);
    }

    @Test
    @DisplayName("verifyOwner throws ConflictException when update returns 0 rows (not in review or already processed)")
    void testVerifyOwnerConflict() {
        when(ownerProfileRepository.updateVerificationStatusIfInReview(
                eq(1L), eq(VerificationStatus.VERIFIED), eq(adminUser), any(Instant.class), eq("All clear")))
                .thenReturn(0);

        assertThatThrownBy(() -> adminModerationService.verifyOwner(1L, adminUser, "All clear"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Owner verification has already been processed or is not in review");

        verify(ownerProfileRepository, never()).findById(any());
        verify(propertyRepository, never()).findByOwnerProfileIdAndStatus(any(), any());
    }

    @Test
    @DisplayName("rejectOwner succeeds and cascades LIVE properties to SUSPENDED")
    void testRejectOwnerSuccessCascadesLiveProperties() {
        when(ownerProfileRepository.updateVerificationStatusIfInReview(
                eq(1L), eq(VerificationStatus.REJECTED), eq(adminUser), any(Instant.class), eq("Fake documents")))
                .thenReturn(1);

        testOwnerProfile.setVerificationStatus(VerificationStatus.REJECTED);
        when(ownerProfileRepository.findById(1L)).thenReturn(Optional.of(testOwnerProfile));

        Property liveProperty = Property.builder()
                .id(30L)
                .ownerProfile(testOwnerProfile)
                .status(PropertyStatus.LIVE)
                .build();

        when(propertyRepository.findByOwnerProfileIdAndStatus(1L, PropertyStatus.LIVE))
                .thenReturn(List.of(liveProperty));

        OwnerProfileResponse response = adminModerationService.rejectOwner(1L, adminUser, "Fake documents");

        assertThat(response).isNotNull();
        assertThat(response.getVerificationStatus()).isEqualTo(VerificationStatus.REJECTED);
        assertThat(liveProperty.getStatus()).isEqualTo(PropertyStatus.SUSPENDED);
        verify(propertyRepository).save(liveProperty);
    }

    @Test
    @DisplayName("rejectOwner throws ConflictException when update returns 0 rows")
    void testRejectOwnerConflict() {
        when(ownerProfileRepository.updateVerificationStatusIfInReview(
                eq(1L), eq(VerificationStatus.REJECTED), eq(adminUser), any(Instant.class), eq("Rejected")))
                .thenReturn(0);

        assertThatThrownBy(() -> adminModerationService.rejectOwner(1L, adminUser, "Rejected"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already been processed or is not in review");

        verify(propertyRepository, never()).findByOwnerProfileIdAndStatus(any(), any());
    }

    @Test
    @DisplayName("requestMoreInfoOwner succeeds")
    void testRequestMoreInfoOwnerSuccess() {
        when(ownerProfileRepository.updateVerificationStatusIfInReview(
                eq(1L), eq(VerificationStatus.MORE_INFORMATION_REQUIRED), eq(adminUser), any(Instant.class), eq("Upload electricity bill")))
                .thenReturn(1);

        testOwnerProfile.setVerificationStatus(VerificationStatus.MORE_INFORMATION_REQUIRED);
        when(ownerProfileRepository.findById(1L)).thenReturn(Optional.of(testOwnerProfile));

        OwnerProfileResponse response = adminModerationService.requestMoreInfoOwner(1L, adminUser, "Upload electricity bill");

        assertThat(response).isNotNull();
        assertThat(response.getVerificationStatus()).isEqualTo(VerificationStatus.MORE_INFORMATION_REQUIRED);
    }

    @Test
    @DisplayName("requestMoreInfoOwner throws ConflictException when update returns 0 rows")
    void testRequestMoreInfoOwnerConflict() {
        when(ownerProfileRepository.updateVerificationStatusIfInReview(
                eq(1L), eq(VerificationStatus.MORE_INFORMATION_REQUIRED), eq(adminUser), any(Instant.class), eq("Info needed")))
                .thenReturn(0);

        assertThatThrownBy(() -> adminModerationService.requestMoreInfoOwner(1L, adminUser, "Info needed"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already been processed or is not in review");
    }

    // --- Property Moderation Actions ---

    @Test
    @DisplayName("approveProperty transitions immediately to LIVE when owner is VERIFIED")
    void testApprovePropertyOwnerVerifiedTransitionsToLive() {
        testOwnerProfile.setVerificationStatus(VerificationStatus.VERIFIED);
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.APPROVED), eq(adminUser), any(Instant.class), eq("Looks great")))
                .thenReturn(1);

        when(propertyRepository.findById(10L)).thenReturn(Optional.of(testProperty));

        PropertyResponse response = adminModerationService.approveProperty(10L, adminUser, "Looks great");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PropertyStatus.LIVE);
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.LIVE);
        verify(propertyRepository).save(testProperty);
    }

    @Test
    @DisplayName("approveProperty remains APPROVED when owner is NOT verified")
    void testApprovePropertyOwnerNotVerifiedRemainsApproved() {
        testOwnerProfile.setVerificationStatus(VerificationStatus.SUBMITTED);
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.APPROVED), eq(adminUser), any(Instant.class), eq("Property verified, waiting for owner KYC")))
                .thenReturn(1);

        when(propertyRepository.findById(10L)).thenReturn(Optional.of(testProperty));

        PropertyResponse response = adminModerationService.approveProperty(10L, adminUser, "Property verified, waiting for owner KYC");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PropertyStatus.APPROVED);
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.APPROVED);
        // save is called only when transitioning to LIVE in attemptTransitionToLive
        verify(propertyRepository, never()).save(testProperty);
    }

    @Test
    @DisplayName("approveProperty throws ConflictException when update returns 0 rows")
    void testApprovePropertyConflict() {
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.APPROVED), eq(adminUser), any(Instant.class), eq("Approve")))
                .thenReturn(0);

        assertThatThrownBy(() -> adminModerationService.approveProperty(10L, adminUser, "Approve"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Property moderation has already been processed or is not in review");

        verify(propertyRepository, never()).findById(any());
    }

    @Test
    @DisplayName("rejectProperty succeeds")
    void testRejectPropertySuccess() {
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.REJECTED), eq(adminUser), any(Instant.class), eq("Commercial property listed as residential")))
                .thenReturn(1);

        when(propertyRepository.findById(10L)).thenReturn(Optional.of(testProperty));

        PropertyResponse response = adminModerationService.rejectProperty(10L, adminUser, "Commercial property listed as residential");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PropertyStatus.REJECTED);
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.REJECTED);
    }

    @Test
    @DisplayName("rejectProperty throws ConflictException when update returns 0 rows")
    void testRejectPropertyConflict() {
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.REJECTED), eq(adminUser), any(Instant.class), eq("Reject")))
                .thenReturn(0);

        assertThatThrownBy(() -> adminModerationService.rejectProperty(10L, adminUser, "Reject"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already been processed or is not in review");
    }

    @Test
    @DisplayName("requestMoreInfoProperty succeeds")
    void testRequestMoreInfoPropertySuccess() {
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.MORE_INFORMATION_REQUIRED), eq(adminUser), any(Instant.class), eq("Clear floor photos needed")))
                .thenReturn(1);

        when(propertyRepository.findById(10L)).thenReturn(Optional.of(testProperty));

        PropertyResponse response = adminModerationService.requestMoreInfoProperty(10L, adminUser, "Clear floor photos needed");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PropertyStatus.MORE_INFORMATION_REQUIRED);
        assertThat(testProperty.getStatus()).isEqualTo(PropertyStatus.MORE_INFORMATION_REQUIRED);
    }

    @Test
    @DisplayName("requestMoreInfoProperty throws ConflictException when update returns 0 rows")
    void testRequestMoreInfoPropertyConflict() {
        when(propertyRepository.updatePropertyStatusIfInReview(
                eq(10L), eq(PropertyStatus.MORE_INFORMATION_REQUIRED), eq(adminUser), any(Instant.class), eq("Info")))
                .thenReturn(0);

        assertThatThrownBy(() -> adminModerationService.requestMoreInfoProperty(10L, adminUser, "Info"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already been processed or is not in review");
    }

    // --- Admin Queue Query Tests ---

    @Test
    @DisplayName("listOwners with status returns filtered page")
    void testListOwnersWithStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        when(ownerProfileRepository.findAllByVerificationStatus(VerificationStatus.SUBMITTED, pageable))
                .thenReturn(new PageImpl<>(List.of(testOwnerProfile), pageable, 1));

        Page<OwnerProfileResponse> page = adminModerationService.listOwners(VerificationStatus.SUBMITTED, pageable);

        assertThat(page).hasSize(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(1L);
        verify(ownerProfileRepository).findAllByVerificationStatus(VerificationStatus.SUBMITTED, pageable);
    }

    @Test
    @DisplayName("listOwners with null status returns all owners")
    void testListOwnersWithoutStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        when(ownerProfileRepository.findAll(pageable))
                .thenReturn(new PageImpl<>(List.of(testOwnerProfile), pageable, 1));

        Page<OwnerProfileResponse> page = adminModerationService.listOwners(null, pageable);

        assertThat(page).hasSize(1);
        verify(ownerProfileRepository).findAll(pageable);
    }

    @Test
    @DisplayName("getOwner returns response when found")
    void testGetOwnerSuccess() {
        when(ownerProfileRepository.findById(1L)).thenReturn(Optional.of(testOwnerProfile));

        OwnerProfileResponse response = adminModerationService.getOwner(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getOwner throws ResourceNotFoundException when not found")
    void testGetOwnerNotFound() {
        when(ownerProfileRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminModerationService.getOwner(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Owner profile not found with ID: 999");
    }

    @Test
    @DisplayName("listProperties with status returns filtered page")
    void testListPropertiesWithStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        when(propertyRepository.findAllByStatus(PropertyStatus.SUBMITTED, pageable))
                .thenReturn(new PageImpl<>(List.of(testProperty), pageable, 1));

        Page<PropertyResponse> page = adminModerationService.listProperties(PropertyStatus.SUBMITTED, pageable);

        assertThat(page).hasSize(1);
        assertThat(page.getContent().get(0).getId()).isEqualTo(10L);
        verify(propertyRepository).findAllByStatus(PropertyStatus.SUBMITTED, pageable);
    }

    @Test
    @DisplayName("listProperties without status returns all properties")
    void testListPropertiesWithoutStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        when(propertyRepository.findAll(pageable))
                .thenReturn(new PageImpl<>(List.of(testProperty), pageable, 1));

        Page<PropertyResponse> page = adminModerationService.listProperties(null, pageable);

        assertThat(page).hasSize(1);
        verify(propertyRepository).findAll(pageable);
    }

    @Test
    @DisplayName("getProperty returns detail response when found")
    void testGetPropertySuccess() {
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(testProperty));

        PropertyDetailResponse response = adminModerationService.getProperty(10L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("getProperty throws ResourceNotFoundException when not found")
    void testGetPropertyNotFound() {
        when(propertyRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminModerationService.getProperty(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Property not found with ID: 999");
    }

    @Test
    @DisplayName("purgeOwnerAccount records admin action and calls ownerProfileService.deleteOwnerAccount")
    void purgeOwnerAccount_Success() {
        when(ownerProfileRepository.findById(10L)).thenReturn(Optional.of(testOwnerProfile));

        adminModerationService.purgeOwnerAccount(10L, adminUser, "User requested GDPR erasure");

        verify(adminActionRepository).save(any(AdminAction.class));
        verify(ownerProfileService).deleteOwnerAccount(testOwnerProfile.getUser().getId());
    }
}
