package com.platform.document.service;

import com.platform.common.exception.ResourceNotFoundException;
import com.platform.document.dto.DocumentResponse;
import com.platform.document.dto.DownloadResource;
import com.platform.admin.entity.AdminAction;
import com.platform.admin.repository.AdminActionRepository;
import com.platform.document.entity.Document;
import com.platform.document.entity.DocumentStatus;
import com.platform.document.entity.DocumentType;
import com.platform.document.repository.DocumentRepository;
import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.property.entity.Property;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
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
public class DocumentStorageService {

    public static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024; // 20MB

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png"
    );

    @Value("${app.document.dir:/var/app/secure-docs}")
    private String documentDir;

    private final DocumentRepository documentRepository;
    private final AdminActionRepository adminActionRepository;
    private final OwnerProfileRepository ownerProfileRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;

    @PostConstruct
    public void init() {
        try {
            Path baseDir = Path.of(documentDir).toAbsolutePath().normalize();
            Files.createDirectories(baseDir);
            log.info("Initialized secure document directory at: {}", baseDir);
        } catch (IOException e) {
            log.warn("Could not create secure document directory on startup: {}", e.getMessage());
        }
    }

    /**
     * Resolves the physical path on disk for a given storage key.
     */
    public Path resolvePhysicalPath(String storageKey) {
        Path base = Path.of(documentDir).toAbsolutePath().normalize();
        String relativePath = storageKey;
        if (relativePath.startsWith("docs/")) {
            if (base.getFileName() != null && "docs".equals(base.getFileName().toString())) {
                relativePath = relativePath.substring("docs/".length());
            }
        }
        return base.resolve(relativePath).normalize();
    }

    /**
     * Upload and store a private document with orphan-file cleanup rule.
     */
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentType documentType, Long propertyId, Long currentUserId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        if (documentType == null) {
            throw new IllegalArgumentException("Document type is required");
        }

        long fileSize = file.getSize();
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 20MB");
        }

        OwnerProfile ownerProfile = ownerProfileRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Owner profile not found for user id: " + currentUserId));

        Property property = null;
        if (propertyId != null) {
            property = propertyRepository.findById(propertyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + propertyId));

            if (property.getOwnerProfile() == null || !property.getOwnerProfile().getId().equals(ownerProfile.getId())) {
                throw new AccessDeniedException("You do not have permission to attach documents to this property");
            }
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

        // Storage Key Generation: docs/<uuid>.<ext>
        String uuid = UUID.randomUUID().toString();
        String storageKey = "docs/" + uuid + "." + ext;

        Path targetPath = resolvePhysicalPath(storageKey);

        // Orphan-file rule (CRITICAL):
        // 1. Write file bytes to disk in secure documents directory
        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to write document file to disk: {}", targetPath, e);
            throw new RuntimeException("Failed to store document on disk: " + e.getMessage(), e);
        }

        // 2. Insert database record (Document)
        Document entity = Document.builder()
                .ownerProfile(ownerProfile)
                .property(property)
                .documentType(documentType)
                .storageKey(storageKey)
                .originalFilename(cleanOriginalFilename(file.getOriginalFilename()))
                .fileSizeBytes(fileSize)
                .contentType(contentType)
                .status(DocumentStatus.UPLOADED)
                .build();

        // 3. If DB save fails (or any error occurs after file creation),
        // catches Throwable, deletes the physical file from disk immediately, and rethrows.
        Document saved;
        try {
            saved = documentRepository.saveAndFlush(entity);
        } catch (Throwable t) {
            log.error("Database save failed for document. Deleting physical file immediately: {}", targetPath, t);
            try {
                Files.deleteIfExists(targetPath);
            } catch (Exception ex) {
                log.error("Failed to delete physical file during orphan cleanup: {}", targetPath, ex);
            }
            throw t;
        }

        return DocumentResponse.fromEntity(saved);
    }

    /**
     * Retrieves download resource with permission checking and administrative auditing.
     */
    @Transactional
    public DownloadResource getDownloadResource(Long documentId, Long currentUserId, boolean isAdmin, String clientIp) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        boolean isOwner = document.getOwnerProfile() != null
                && document.getOwnerProfile().getUser() != null
                && document.getOwnerProfile().getUser().getId().equals(currentUserId);

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("Access denied to document");
        }

        if (isAdmin) {
            User adminUser = userRepository.findById(currentUserId).orElse(null);
            AdminAction auditAction = AdminAction.builder()
                    .admin(adminUser)
                    .action("ADMIN_DOCUMENT_DOWNLOAD")
                    .targetType("DOCUMENT")
                    .targetId(document.getId())
                    .details("Downloaded KYC document for owner profile " + (document.getOwnerProfile() != null ? document.getOwnerProfile().getId() : "null"))
                    .ipAddress(clientIp)
                    .build();
            adminActionRepository.save(auditAction);
        }

        Path targetPath = resolvePhysicalPath(document.getStorageKey());
        if (!Files.exists(targetPath)) {
            throw new ResourceNotFoundException("Document file not found on disk");
        }

        Resource resource;
        try {
            resource = new UrlResource(targetPath.toUri());
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error preparing document download resource: " + e.getMessage(), e);
        }

        return new DownloadResource(resource, document.getContentType(), document.getOriginalFilename());
    }

    /**
     * Lists documents belonging to the authenticated owner.
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> getOwnerDocuments(Long currentUserId) {
        return documentRepository.findByOwnerProfileUserId(currentUserId)
                .stream()
                .map(DocumentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Deletion cleanup: deletes DB row and physical file (allowed only if status is not VERIFIED).
     */
    @Transactional
    public void deleteDocument(Long documentId, Long currentUserId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        boolean isOwner = document.getOwnerProfile() != null
                && document.getOwnerProfile().getUser() != null
                && document.getOwnerProfile().getUser().getId().equals(currentUserId);

        if (!isOwner) {
            throw new AccessDeniedException("Access denied to document");
        }

        if (document.getStatus() == DocumentStatus.VERIFIED) {
            throw new IllegalStateException("Verified documents cannot be deleted");
        }

        String storageKey = document.getStorageKey();

        // 1. Delete DB row
        documentRepository.delete(document);
        documentRepository.flush();

        // 2. Remove physical file from disk
        Path targetPath = resolvePhysicalPath(storageKey);
        try {
            Files.deleteIfExists(targetPath);
        } catch (Exception e) {
            log.error("Failed to delete physical document file: {}", targetPath, e);
        }
    }

    /**
     * Validates file size, MIME type whitelist, and magic bytes.
     * Magic Bytes:
     * - PDF: starts with %PDF (0x25, 0x50, 0x44, 0x46)
     * - JPEG: 0xFF, 0xD8, 0xFF
     * - PNG: 0x89, 0x50, 0x4E, 0x47
     */
    public String validateAndDetectExtension(byte[] bytes, String declaredMimeType, long fileSize) {
        if (fileSize <= 0 || bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("File cannot be empty");
        }
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 20MB");
        }
        if (declaredMimeType == null || !ALLOWED_MIME_TYPES.contains(declaredMimeType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported media type: " + declaredMimeType + ". Whitelist: application/pdf, image/jpeg, image/png");
        }

        String normalizedMime = declaredMimeType.toLowerCase();
        String detectedExt;
        if (isPdf(bytes)) {
            detectedExt = "pdf";
        } else if (isJpeg(bytes)) {
            detectedExt = "jpg";
        } else if (isPng(bytes)) {
            detectedExt = "png";
        } else {
            throw new IllegalArgumentException("File magic bytes inspection failed. Invalid or unrecognized document content.");
        }

        // Verify detected format matches claimed MIME type
        if ("application/pdf".equals(normalizedMime) && !"pdf".equals(detectedExt)) {
            throw new IllegalArgumentException("MIME type 'application/pdf' does not match file magic bytes");
        }
        if ("image/jpeg".equals(normalizedMime) && !"jpg".equals(detectedExt)) {
            throw new IllegalArgumentException("MIME type 'image/jpeg' does not match file magic bytes");
        }
        if ("image/png".equals(normalizedMime) && !"png".equals(detectedExt)) {
            throw new IllegalArgumentException("MIME type 'image/png' does not match file magic bytes");
        }

        return detectedExt;
    }

    private boolean isPdf(byte[] b) {
        return b != null && b.length >= 4 &&
                b[0] == 0x25 && // %
                b[1] == 0x50 && // P
                b[2] == 0x44 && // D
                b[3] == 0x46;   // F
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
            return "document";
        }
        try {
            return Paths.get(originalFilename).getFileName().toString();
        } catch (Exception e) {
            return originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        }
    }
}
