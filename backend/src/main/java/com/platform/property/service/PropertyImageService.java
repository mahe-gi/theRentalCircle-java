package com.platform.property.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.common.exception.UnauthorizedException;
import com.platform.owner.entity.OwnerProfile;
import com.platform.property.dto.PropertyImageResponse;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyImage;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyImageRepository;
import com.platform.property.repository.PropertyRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyImageService {

    public static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024; // 10MB

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    @Value("${app.upload.dir:/var/app/uploads/properties}")
    private String uploadDir;

    private final PropertyImageRepository propertyImageRepository;
    private final PropertyRepository propertyRepository;

    @PostConstruct
    public void init() {
        try {
            Path baseDir = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(baseDir);
            log.info("Initialized property upload directory at: {}", baseDir);
        } catch (IOException e) {
            log.warn("Could not create upload directory on startup: {}", e.getMessage());
        }
    }

    /**
     * Resolves the physical path on disk for a given storage key.
     * Handles both '/var/app/uploads/properties' and parent '/var/app/uploads' configurations.
     */
    public Path resolvePhysicalPath(String storageKey) {
        Path base = Path.of(uploadDir).toAbsolutePath().normalize();
        String relativePath = storageKey;
        if (relativePath.startsWith("properties/")) {
            if (base.getFileName() != null && "properties".equals(base.getFileName().toString())) {
                relativePath = relativePath.substring("properties/".length());
            }
        }
        return base.resolve(relativePath).normalize();
    }

    /**
     * Upload an image with owner authentication and DRAFT status verification.
     */
    @Transactional
    public PropertyImageResponse uploadImage(Long propertyId, MultipartFile file, Long currentUserId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        validatePropertyOwnership(property, currentUserId);

        if (property.getStatus() != PropertyStatus.DRAFT) {
            throw new IllegalStateException("Images can only be uploaded when property is in DRAFT status. Current status: " + property.getStatus());
        }

        return uploadImageInternal(property, file);
    }

    /**
     * Upload an image for a property without explicit user context (e.g. system tasks or admin).
     */
    @Transactional
    public PropertyImageResponse uploadImage(Long propertyId, MultipartFile file) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        if (property.getStatus() != PropertyStatus.DRAFT) {
            throw new IllegalStateException("Images can only be uploaded when property is in DRAFT status. Current status: " + property.getStatus());
        }

        return uploadImageInternal(property, file);
    }

    private PropertyImageResponse uploadImageInternal(Property property, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        long fileSize = file.getSize();
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 10MB");
        }

        String rawContentType = file.getContentType();
        String contentType = sanitizeContentType(rawContentType);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file bytes", e);
        }

        // Validate MIME type whitelist and inspect MAGIC BYTES
        String ext = validateAndDetectExtension(bytes, contentType, fileSize);

        // Storage Key Generation: properties/<uuid>.<ext>
        String uuid = UUID.randomUUID().toString();
        String storageKey = "properties/" + uuid + "." + ext;

        Path targetPath = resolvePhysicalPath(storageKey);

        // Orphan-file rule (CRITICAL):
        // 1. Write file bytes to disk in upload directory
        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to write image file to disk: {}", targetPath, e);
            throw new RuntimeException("Failed to store image on disk: " + e.getMessage(), e);
        }

        // 2. Insert database record (PropertyImage)
        long currentCount = propertyImageRepository.countByPropertyId(property.getId());
        boolean isPrimary = (currentCount == 0);
        int displayOrder = (int) currentCount;

        PropertyImage entity = PropertyImage.builder()
                .property(property)
                .storageKey(storageKey)
                .originalFilename(cleanOriginalFilename(file.getOriginalFilename()))
                .fileSizeBytes(fileSize)
                .contentType(contentType)
                .displayOrder(displayOrder)
                .isPrimary(isPrimary)
                .build();

        // 3. If DB save fails (or any error occurs after file creation),
        // catches Throwable, deletes the physical file from disk immediately, and rethrows.
        PropertyImage saved;
        try {
            saved = propertyImageRepository.saveAndFlush(entity);
        } catch (Throwable t) {
            log.error("Database save failed for property image. Deleting physical file immediately: {}", targetPath, t);
            try {
                Files.deleteIfExists(targetPath);
            } catch (Exception ex) {
                log.error("Failed to delete physical file during orphan cleanup: {}", targetPath, ex);
            }
            throw t;
        }

        return PropertyImageResponse.fromEntity(saved);
    }

    /**
     * Delete an image with owner validation.
     */
    @Transactional
    public void deleteImage(Long propertyId, Long imageId, Long currentUserId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        validatePropertyOwnership(property, currentUserId);

        deleteImage(propertyId, imageId);
    }

    /**
     * Delete an image and cleans up physical file from disk.
     */
    @Transactional
    public void deleteImage(Long propertyId, Long imageId) {
        PropertyImage image = propertyImageRepository.findByIdAndPropertyId(imageId, propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property image not found with id: " + imageId));

        String storageKey = image.getStorageKey();
        boolean wasPrimary = image.isPrimary();

        // 1. Delete DB row
        propertyImageRepository.delete(image);
        propertyImageRepository.flush();

        // 2. Remove physical file from disk
        Path targetPath = resolvePhysicalPath(storageKey);
        try {
            Files.deleteIfExists(targetPath);
        } catch (Exception e) {
            log.error("Failed to delete physical image file: {}", targetPath, e);
        }

        // 3. If deleted image was primary, set another remaining image as primary
        if (wasPrimary) {
            List<PropertyImage> remaining = propertyImageRepository.findByPropertyIdOrderByDisplayOrderAsc(propertyId);
            if (!remaining.isEmpty()) {
                PropertyImage nextPrimary = remaining.get(0);
                nextPrimary.setPrimary(true);
                propertyImageRepository.saveAndFlush(nextPrimary);
            }
        }
    }

    /**
     * Sets an image as primary cover image with owner validation.
     */
    @Transactional
    public PropertyImageResponse setPrimary(Long propertyId, Long imageId, Long currentUserId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

        validatePropertyOwnership(property, currentUserId);

        return setPrimary(propertyId, imageId);
    }

    /**
     * Sets primary cover image: sets is_primary = true on target image and false on all other images of that property.
     */
    @Transactional
    public PropertyImageResponse setPrimary(Long propertyId, Long imageId) {
        PropertyImage targetImage = propertyImageRepository.findByIdAndPropertyId(imageId, propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property image not found with id: " + imageId));

        List<PropertyImage> images = propertyImageRepository.findByPropertyIdOrderByDisplayOrderAsc(propertyId);
        for (PropertyImage img : images) {
            boolean isTarget = img.getId().equals(imageId);
            img.setPrimary(isTarget);
            propertyImageRepository.save(img);
        }
        propertyImageRepository.flush();

        targetImage.setPrimary(true);
        return PropertyImageResponse.fromEntity(targetImage);
    }

    /**
     * Returns all images for a property ordered by display order.
     */
    @Transactional(readOnly = true)
    public List<PropertyImageResponse> getImagesForProperty(Long propertyId) {
        return propertyImageRepository.findByPropertyIdOrderByDisplayOrderAsc(propertyId)
                .stream()
                .map(PropertyImageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Delete all images and disk files for a property.
     */
    @Transactional
    public void deleteAllImagesForProperty(Long propertyId) {
        List<PropertyImage> images = propertyImageRepository.findByPropertyId(propertyId);
        for (PropertyImage img : images) {
            Path targetPath = resolvePhysicalPath(img.getStorageKey());
            try {
                Files.deleteIfExists(targetPath);
            } catch (Exception e) {
                log.error("Failed to delete physical file: {}", targetPath, e);
            }
        }
        propertyImageRepository.deleteByPropertyId(propertyId);
        propertyImageRepository.flush();
    }

    /**
     * Validates that the current user owns the property via owner profile.
     */
    public void validatePropertyOwnership(Property property, Long currentUserId) {
        if (currentUserId == null) {
            throw new UnauthorizedException("Authentication required");
        }
        OwnerProfile ownerProfile = property.getOwnerProfile();
        if (ownerProfile == null) {
            throw new ResourceNotFoundException("Owner profile not found for property");
        }
        if (ownerProfile.getUser() == null || !ownerProfile.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("You do not have permission to manage this property");
        }
    }

    /**
     * Validates file size, MIME type whitelist, and magic bytes.
     * Magic Bytes:
     * - JPEG: 0xFF, 0xD8, 0xFF
     * - PNG: 0x89, 0x50, 0x4E, 0x47
     * - WebP: RIFF....WEBP
     */
    public String validateAndDetectExtension(byte[] bytes, String declaredMimeType, long fileSize) {
        if (fileSize <= 0 || bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("File cannot be empty");
        }
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 10MB");
        }
        if (declaredMimeType == null || !ALLOWED_MIME_TYPES.contains(declaredMimeType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported media type: " + declaredMimeType + ". Whitelist: image/jpeg, image/png, image/webp");
        }

        String normalizedMime = declaredMimeType.toLowerCase();
        String detectedExt;
        if (isJpeg(bytes)) {
            detectedExt = "jpg";
        } else if (isPng(bytes)) {
            detectedExt = "png";
        } else if (isWebP(bytes)) {
            detectedExt = "webp";
        } else {
            throw new IllegalArgumentException("File magic bytes inspection failed. Invalid or unrecognized image content.");
        }

        // Verify detected format matches claimed MIME type
        if ("image/jpeg".equals(normalizedMime) && !"jpg".equals(detectedExt)) {
            throw new IllegalArgumentException("MIME type 'image/jpeg' does not match file magic bytes");
        }
        if ("image/png".equals(normalizedMime) && !"png".equals(detectedExt)) {
            throw new IllegalArgumentException("MIME type 'image/png' does not match file magic bytes");
        }
        if ("image/webp".equals(normalizedMime) && !"webp".equals(detectedExt)) {
            throw new IllegalArgumentException("MIME type 'image/webp' does not match file magic bytes");
        }

        return detectedExt;
    }

    private boolean isJpeg(byte[] b) {
        return b != null && b.length >= 3 &&
                (b[0] & 0xFF) == 0xFF &&
                (b[1] & 0xFF) == 0xD8 &&
                (b[2] & 0xFF) == 0xFF;
    }

    private boolean isPng(byte[] b) {
        return b != null && b.length >= 4 &&
                (b[0] & 0xFF) == 0x89 &&
                (b[1] & 0xFF) == 0x50 &&
                (b[2] & 0xFF) == 0x4E &&
                (b[3] & 0xFF) == 0x47;
    }

    private boolean isWebP(byte[] b) {
        if (b == null || b.length < 12) {
            return false;
        }
        // RIFF header: bytes 0-3 are 'R', 'I', 'F', 'F'
        boolean riff = b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F';
        // WEBP signature: bytes 8-11 are 'W', 'E', 'B', 'P'
        boolean webp = b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        return riff && webp;
    }

    private String sanitizeContentType(String raw) {
        if (raw == null) {
            return null;
        }
        String contentType = raw.trim();
        if (contentType.contains(";")) {
            contentType = contentType.split(";")[0].trim();
        }
        if ("image/jpg".equalsIgnoreCase(contentType)) {
            contentType = "image/jpeg";
        }
        return contentType.toLowerCase();
    }

    private String cleanOriginalFilename(String originalFilename) {
        if (originalFilename == null) {
            return "image";
        }
        try {
            return Paths.get(originalFilename).getFileName().toString();
        } catch (Exception e) {
            return originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        }
    }
}
