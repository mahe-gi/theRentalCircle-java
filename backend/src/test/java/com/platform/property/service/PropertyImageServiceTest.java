package com.platform.property.service;

import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.OwnershipType;
import com.platform.property.dto.PropertyImageResponse;
import com.platform.property.entity.*;
import com.platform.property.repository.PropertyImageRepository;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PropertyImageServiceTest {

    @Mock
    private PropertyImageRepository propertyImageRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @InjectMocks
    private PropertyImageService propertyImageService;

    @TempDir
    Path tempUploadDir;

    private Property draftProperty;
    private OwnerProfile ownerProfile;
    private User ownerUser;

    // Standard valid magic bytes
    private static final byte[] VALID_JPEG_BYTES = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x11, 0x22};
    private static final byte[] VALID_PNG_BYTES = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] VALID_WEBP_BYTES = new byte[]{
            'R', 'I', 'F', 'F',
            0x24, 0x00, 0x00, 0x00,
            'W', 'E', 'B', 'P',
            0x00, 0x01
    };

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(propertyImageService, "uploadDir", tempUploadDir.toString());

        ownerUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        ownerProfile = OwnerProfile.builder()
                .id(10L)
                .user(ownerUser)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(true)
                .build();

        draftProperty = Property.builder()
                .id(100L)
                .ownerProfile(ownerProfile)
                .status(PropertyStatus.DRAFT)
                .title("Cozy 2BHK Apartment")
                .propertyType(PropertyType.APARTMENT)
                .listingType(ListingType.RENT)
                .build();
    }

    @Test
    @DisplayName("Upload valid JPEG succeeds, generates UUID storage key, and derives URL")
    void uploadValidJpeg_Success() {
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));
        when(propertyImageRepository.countByPropertyId(100L)).thenReturn(0L);

        when(propertyImageRepository.saveAndFlush(any(PropertyImage.class))).thenAnswer(invocation -> {
            PropertyImage img = invocation.getArgument(0);
            img.setId(501L);
            return img;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "living_room.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        PropertyImageResponse response = propertyImageService.uploadImage(100L, file, 1L);

        assertNotNull(response);
        assertEquals(501L, response.getId());
        assertEquals(100L, response.getPropertyId());
        assertTrue(response.getStorageKey().startsWith("properties/"));
        assertTrue(response.getStorageKey().endsWith(".jpg"));
        assertEquals("/uploads/" + response.getStorageKey(), response.getUrl());
        assertEquals("living_room.jpg", response.getOriginalFilename());
        assertEquals("image/jpeg", response.getContentType());
        assertTrue(response.getIsPrimary());
        assertEquals(0, response.getDisplayOrder());

        // Verify physical file was written to disk
        Path physicalPath = propertyImageService.resolvePhysicalPath(response.getStorageKey());
        assertTrue(Files.exists(physicalPath));
    }

    @Test
    @DisplayName("Upload valid PNG succeeds with .png extension")
    void uploadValidPng_Success() {
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));
        when(propertyImageRepository.countByPropertyId(100L)).thenReturn(1L);

        when(propertyImageRepository.saveAndFlush(any(PropertyImage.class))).thenAnswer(invocation -> {
            PropertyImage img = invocation.getArgument(0);
            img.setId(502L);
            return img;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "kitchen.png", "image/png", VALID_PNG_BYTES
        );

        PropertyImageResponse response = propertyImageService.uploadImage(100L, file, 1L);

        assertNotNull(response);
        assertTrue(response.getStorageKey().endsWith(".png"));
        assertFalse(response.getIsPrimary()); // Second image is not primary
        assertEquals(1, response.getDisplayOrder());
    }

    @Test
    @DisplayName("Upload valid WebP succeeds with .webp extension")
    void uploadValidWebP_Success() {
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));
        when(propertyImageRepository.countByPropertyId(100L)).thenReturn(0L);

        when(propertyImageRepository.saveAndFlush(any(PropertyImage.class))).thenAnswer(invocation -> {
            PropertyImage img = invocation.getArgument(0);
            img.setId(503L);
            return img;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "balcony.webp", "image/webp", VALID_WEBP_BYTES
        );

        PropertyImageResponse response = propertyImageService.uploadImage(100L, file, 1L);

        assertNotNull(response);
        assertTrue(response.getStorageKey().endsWith(".webp"));
    }

    @Test
    @DisplayName("Upload fails when file exceeds 10MB limit")
    void uploadExceedsMaxSize_ThrowsException() {
        byte[] largeBytes = new byte[10 * 1024 * 1024 + 1]; // 10MB + 1 byte
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge.jpg", "image/jpeg", largeBytes
        );

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                propertyImageService.uploadImage(100L, file, 1L)
        );
        assertTrue(ex.getMessage().contains("exceeds maximum allowed limit of 10MB"));
    }

    @Test
    @DisplayName("Upload fails when MIME type is not whitelisted")
    void uploadDisallowedMimeType_ThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "document.pdf", "application/pdf", new byte[]{0x25, 0x50, 0x44, 0x46}
        );

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                propertyImageService.uploadImage(100L, file, 1L)
        );
        assertTrue(ex.getMessage().contains("Unsupported media type"));
    }

    @Test
    @DisplayName("Upload fails when MIME type is image/jpeg but magic bytes are not JPEG")
    void uploadCorruptedMagicBytes_ThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.jpg", "image/jpeg", new byte[]{0x00, 0x01, 0x02, 0x03}
        );

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                propertyImageService.uploadImage(100L, file, 1L)
        );
        assertTrue(ex.getMessage().contains("magic bytes inspection failed"));
    }

    @Test
    @DisplayName("Upload fails when MIME type claims image/jpeg but magic bytes are PNG")
    void uploadMimeMagicMismatch_ThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "mismatch.jpg", "image/jpeg", VALID_PNG_BYTES
        );

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                propertyImageService.uploadImage(100L, file, 1L)
        );
        assertTrue(ex.getMessage().contains("does not match file magic bytes"));
    }

    @Test
    @DisplayName("CRITICAL Orphan-File Rule: When DB save fails, physical file is immediately deleted from disk")
    void orphanFileRule_DeletesDiskFileOnDbFailure() {
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));
        when(propertyImageRepository.countByPropertyId(100L)).thenReturn(0L);

        // Simulate database failure during save
        when(propertyImageRepository.saveAndFlush(any(PropertyImage.class)))
                .thenThrow(new RuntimeException("Simulated Database Connection Failure"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        assertThrows(RuntimeException.class, () ->
                propertyImageService.uploadImage(100L, file, 1L)
        );

        // Verify that no orphaned files exist in the temp upload directory
        try {
            long fileCount = Files.walk(tempUploadDir)
                    .filter(Files::isRegularFile)
                    .count();
            assertEquals(0L, fileCount, "Orphaned physical file must be deleted when DB save fails");
        } catch (IOException e) {
            fail("IO Error checking temp upload dir: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("Ownership validation: Reject upload when user is not the owner of property")
    void uploadUnauthorizedOwner_ThrowsAccessDenied() {
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        // User 999L is not owner 1L
        assertThrows(AccessDeniedException.class, () ->
                propertyImageService.uploadImage(100L, file, 999L)
        );
    }

    @Test
    @DisplayName("Status validation: Reject upload when property is not in DRAFT status")
    void uploadNonDraftProperty_ThrowsIllegalState() {
        Property submittedProperty = Property.builder()
                .id(200L)
                .ownerProfile(ownerProfile)
                .status(PropertyStatus.SUBMITTED)
                .build();

        when(propertyRepository.findById(200L)).thenReturn(Optional.of(submittedProperty));

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                propertyImageService.uploadImage(200L, file, 1L)
        );
        assertTrue(ex.getMessage().contains("DRAFT status"));
    }

    @Test
    @DisplayName("Delete image deletes DB row and removes physical file from disk")
    void deleteImage_DeletesDbAndPhysicalFile() throws IOException {
        String storageKey = "properties/test-delete-uuid.jpg";
        Path physicalPath = propertyImageService.resolvePhysicalPath(storageKey);
        Files.createDirectories(physicalPath.getParent());
        Files.write(physicalPath, VALID_JPEG_BYTES);
        assertTrue(Files.exists(physicalPath));

        PropertyImage image = PropertyImage.builder()
                .id(888L)
                .property(draftProperty)
                .storageKey(storageKey)
                .isPrimary(false)
                .build();

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));
        when(propertyImageRepository.findByIdAndPropertyId(888L, 100L)).thenReturn(Optional.of(image));

        propertyImageService.deleteImage(100L, 888L, 1L);

        verify(propertyImageRepository, times(1)).delete(image);
        verify(propertyImageRepository, times(1)).flush();
        assertFalse(Files.exists(physicalPath), "Physical file must be deleted upon image deletion");
    }

    @Test
    @DisplayName("setPrimary sets is_primary = true on target image and false on all other images of that property")
    void setPrimary_UpdatesPrimaryFlagsCorrectly() {
        PropertyImage img1 = PropertyImage.builder().id(1L).property(draftProperty).isPrimary(true).displayOrder(0).build();
        PropertyImage img2 = PropertyImage.builder().id(2L).property(draftProperty).isPrimary(false).displayOrder(1).build();
        PropertyImage img3 = PropertyImage.builder().id(3L).property(draftProperty).isPrimary(false).displayOrder(2).build();

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(draftProperty));
        when(propertyImageRepository.findByIdAndPropertyId(2L, 100L)).thenReturn(Optional.of(img2));
        when(propertyImageRepository.findByPropertyIdOrderByDisplayOrderAsc(100L)).thenReturn(List.of(img1, img2, img3));

        PropertyImageResponse response = propertyImageService.setPrimary(100L, 2L, 1L);

        assertNotNull(response);
        assertEquals(2L, response.getId());
        assertTrue(response.getIsPrimary());

        assertFalse(img1.isPrimary());
        assertTrue(img2.isPrimary());
        assertFalse(img3.isPrimary());

        verify(propertyImageRepository, times(3)).save(any(PropertyImage.class));
    }
}
