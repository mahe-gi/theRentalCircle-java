package com.platform.property.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.OwnershipType;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.property.dto.*;
import com.platform.property.entity.*;
import com.platform.property.repository.PropertyAmenityRepository;
import com.platform.property.repository.PropertyImageRepository;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PropertyServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private PropertyAmenityRepository propertyAmenityRepository;

    @Mock
    private PropertyImageRepository propertyImageRepository;

    @Mock
    private OwnerProfileRepository ownerProfileRepository;

    @InjectMocks
    private PropertyService propertyService;

    private User testUser;
    private OwnerProfile testOwnerProfile;
    private Property testDraftProperty;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        testOwnerProfile = OwnerProfile.builder()
                .id(10L)
                .user(testUser)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(true)
                .build();

        testDraftProperty = Property.builder()
                .id(100L)
                .ownerProfile(testOwnerProfile)
                .title("Luxury 2BHK Apartment")
                .propertyType(PropertyType.APARTMENT)
                .listingType(ListingType.RENT)
                .price(new BigDecimal("25000.00"))
                .maintenanceCharges(new BigDecimal("2000.00"))
                .securityDeposit(new BigDecimal("50000.00"))
                .bhk(2)
                .bedrooms(2)
                .bathrooms(2)
                .carpetArea(new BigDecimal("850.00"))
                .builtUpArea(new BigDecimal("1050.00"))
                .furnishing(FurnishingType.SEMI_FURNISHED)
                .status(PropertyStatus.DRAFT)
                .state("Karnataka")
                .city("Bengaluru")
                .district("Bengaluru Urban")
                .locality("Indiranagar")
                .address("100 Feet Road, Indiranagar")
                .pincode("560038")
                .amenities(new HashSet<>())
                .images(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("createDraft creates property with status DRAFT and associates amenities")
    void testCreateDraftSuccess() {
        CreatePropertyRequest request = CreatePropertyRequest.builder()
                .title("Luxury 2BHK Apartment")
                .propertyType(PropertyType.APARTMENT)
                .listingType(ListingType.RENT)
                .price(new BigDecimal("25000.00"))
                .maintenanceCharges(new BigDecimal("2000.00"))
                .securityDeposit(new BigDecimal("50000.00"))
                .bhk(2)
                .bedrooms(2)
                .bathrooms(2)
                .carpetArea(new BigDecimal("850.00"))
                .builtUpArea(new BigDecimal("1050.00"))
                .furnishing(FurnishingType.SEMI_FURNISHED)
                .state("Karnataka")
                .city("Bengaluru")
                .district("Bengaluru Urban")
                .locality("Indiranagar")
                .address("100 Feet Road, Indiranagar")
                .pincode("560038")
                .amenities(List.of("Swimming Pool", "Gym", "Power Backup"))
                .build();

        when(ownerProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(testOwnerProfile));
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> {
            Property p = invocation.getArgument(0);
            p.setId(101L);
            return p;
        });

        PropertyDetailResponse response = propertyService.createDraft(testUser, request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(101L);
        assertThat(response.getStatus()).isEqualTo(PropertyStatus.DRAFT);
        assertThat(response.getTitle()).isEqualTo("Luxury 2BHK Apartment");
        assertThat(response.getDistrict()).isEqualTo("Bengaluru Urban");
        assertThat(response.getAmenities()).containsExactlyInAnyOrder("Swimming Pool", "Gym", "Power Backup");

        ArgumentCaptor<Property> captor = ArgumentCaptor.forClass(Property.class);
        verify(propertyRepository).save(captor.capture());
        Property saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(PropertyStatus.DRAFT);
        assertThat(saved.getOwnerProfile()).isEqualTo(testOwnerProfile);
        assertThat(saved.getAmenities()).hasSize(3);
    }

    @Test
    @DisplayName("createDraft throws ResourceNotFoundException if user is not registered as owner")
    void testCreateDraftNotAnOwner() {
        CreatePropertyRequest request = CreatePropertyRequest.builder()
                .title("Apartment")
                .build();

        when(ownerProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> propertyService.createDraft(testUser, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Owner profile not found");

        verify(propertyRepository, never()).save(any());
    }

    @Test
    @DisplayName("getOwnerProperty returns property when matching ID and owner userId")
    void testGetOwnerPropertySuccess() {
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));

        PropertyDetailResponse response = propertyService.getOwnerProperty(100L, testUser.getId());

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getTitle()).isEqualTo(testDraftProperty.getTitle());
    }

    @Test
    @DisplayName("getOwnerProperty prevents IDOR: throws ResourceNotFoundException if property belongs to different owner")
    void testGetOwnerPropertyIdorPrevention() {
        Long differentUserId = 999L;
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, differentUserId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> propertyService.getOwnerProperty(100L, differentUserId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Property not found with ID: 100");
    }

    @Test
    @DisplayName("updateDraft updates fields and amenities when status is DRAFT")
    void testUpdateDraftSuccess() {
        UpdatePropertyRequest updateRequest = UpdatePropertyRequest.builder()
                .title("Updated Luxury 2BHK Apartment")
                .price(new BigDecimal("28000.00"))
                .district("Bengaluru Urban")
                .amenities(List.of("Clubhouse", "Tennis Court"))
                .build();

        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PropertyDetailResponse response = propertyService.updateDraft(100L, testUser.getId(), updateRequest);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated Luxury 2BHK Apartment");
        assertThat(response.getPrice()).isEqualByComparingTo("28000.00");
        assertThat(response.getDistrict()).isEqualTo("Bengaluru Urban");
        assertThat(response.getAmenities()).containsExactlyInAnyOrder("Clubhouse", "Tennis Court");
    }

    @Test
    @DisplayName("updateDraft throws IllegalStateException when property status is not DRAFT")
    void testUpdateDraftNotDraftThrowsException() {
        testDraftProperty.setStatus(PropertyStatus.SUBMITTED);
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));

        UpdatePropertyRequest updateRequest = UpdatePropertyRequest.builder()
                .title("New Title")
                .build();

        assertThatThrownBy(() -> propertyService.updateDraft(100L, testUser.getId(), updateRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only DRAFT properties can be updated");

        verify(propertyRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteProperty deletes property when status is DRAFT")
    void testDeletePropertySuccess() {
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));

        propertyService.deleteProperty(100L, testUser.getId());

        verify(propertyRepository).delete(testDraftProperty);
    }

    @Test
    @DisplayName("deleteProperty throws IllegalStateException when property is not DRAFT")
    void testDeletePropertyNotDraftThrowsException() {
        testDraftProperty.setStatus(PropertyStatus.SUBMITTED);
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));

        assertThatThrownBy(() -> propertyService.deleteProperty(100L, testUser.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only DRAFT properties can be deleted");

        verify(propertyRepository, never()).delete(any());
    }

    @Test
    @DisplayName("submitProperty transitions status to SUBMITTED when validation and image check pass")
    void testSubmitPropertySuccess() {
        PropertyImage image = PropertyImage.builder()
                .id(1L)
                .property(testDraftProperty)
                .storageKey("properties/100/main.jpg")
                .isPrimary(true)
                .build();
        testDraftProperty.getImages().add(image);

        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));
        when(propertyImageRepository.existsByPropertyId(100L)).thenReturn(true);
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PropertyDetailResponse response = propertyService.submitProperty(100L, testUser.getId());

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(PropertyStatus.SUBMITTED);
        verify(propertyRepository).save(testDraftProperty);
    }

    @Test
    @DisplayName("submitProperty throws IllegalStateException when property has 0 images")
    void testSubmitPropertyNoImagesThrowsException() {
        testDraftProperty.getImages().clear();
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));
        when(propertyImageRepository.existsByPropertyId(100L)).thenReturn(false);

        assertThatThrownBy(() -> propertyService.submitProperty(100L, testUser.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Property must have at least one image before submission");

        verify(propertyRepository, never()).save(any());
    }

    @Test
    @DisplayName("submitProperty throws IllegalStateException when property is missing mandatory fields")
    void testSubmitPropertyMissingFieldsThrowsException() {
        testDraftProperty.setPincode(null); // missing mandatory pincode
        when(propertyRepository.findByIdAndOwnerProfileUserId(100L, testUser.getId()))
                .thenReturn(Optional.of(testDraftProperty));

        assertThatThrownBy(() -> propertyService.submitProperty(100L, testUser.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("pincode is required");

        verify(propertyRepository, never()).save(any());
    }

    @Test
    @DisplayName("listOwnerProperties filters by status when status parameter is provided")
    void testListOwnerPropertiesWithStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Property> page = new PageImpl<>(List.of(testDraftProperty));

        when(propertyRepository.findAllByOwnerProfileUserIdAndStatus(testUser.getId(), "DRAFT", pageable))
                .thenReturn(page);

        Page<PropertyResponse> result = propertyService.listOwnerProperties(testUser.getId(), "DRAFT", pageable);

        assertThat(result).hasSize(1);
        assertThat(result.getContent().getFirst().getStatus()).isEqualTo(PropertyStatus.DRAFT);
        verify(propertyRepository).findAllByOwnerProfileUserIdAndStatus(testUser.getId(), "DRAFT", pageable);
    }

    @Test
    @DisplayName("listOwnerProperties returns all properties when status parameter is blank")
    void testListOwnerPropertiesWithoutStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Property> page = new PageImpl<>(List.of(testDraftProperty));

        when(propertyRepository.findAllByOwnerProfileUserId(testUser.getId(), pageable))
                .thenReturn(page);

        Page<PropertyResponse> result = propertyService.listOwnerProperties(testUser.getId(), null, pageable);

        assertThat(result).hasSize(1);
        verify(propertyRepository).findAllByOwnerProfileUserId(testUser.getId(), pageable);
    }
}
