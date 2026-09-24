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
import com.platform.owner.entity.OwnershipType;
import com.platform.property.entity.ListingType;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.entity.PropertyType;
import com.platform.property.repository.PropertyRepository;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import com.platform.owner.repository.OwnerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
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
class DocumentStorageServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private AdminActionRepository adminActionRepository;

    @Mock
    private OwnerProfileRepository ownerProfileRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DocumentStorageService documentStorageService;

    @TempDir
    Path tempDocDir;

    private User ownerUser;
    private User otherUser;
    private User adminUser;
    private OwnerProfile ownerProfile;
    private OwnerProfile otherOwnerProfile;
    private Property ownerProperty;

    // Magic bytes
    private static final byte[] VALID_PDF_BYTES = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35}; // %PDF-1.5
    private static final byte[] VALID_JPEG_BYTES = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x11, 0x22};
    private static final byte[] VALID_PNG_BYTES = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(documentStorageService, "documentDir", tempDocDir.toString());

        ownerUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        otherUser = User.builder()
                .id(2L)
                .email("other@example.com")
                .firstName("Jane")
                .lastName("Smith")
                .build();

        adminUser = User.builder()
                .id(99L)
                .email("admin@platform.com")
                .firstName("Admin")
                .lastName("User")
                .build();

        ownerProfile = OwnerProfile.builder()
                .id(10L)
                .user(ownerUser)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(true)
                .build();

        otherOwnerProfile = OwnerProfile.builder()
                .id(20L)
                .user(otherUser)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(true)
                .build();

        ownerProperty = Property.builder()
                .id(100L)
                .ownerProfile(ownerProfile)
                .title("Luxury Villa")
                .propertyType(PropertyType.VILLA)
                .listingType(ListingType.RENT)
                .status(PropertyStatus.DRAFT)
                .build();
    }

    @Test
    @DisplayName("Upload valid PDF succeeds, generates docs/<uuid>.pdf storage key, and writes to disk")
    void uploadValidPdf_Success() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> {
            Document doc = inv.getArgument(0);
            doc.setId(301L);
            return doc;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "title_deed.pdf", "application/pdf", VALID_PDF_BYTES
        );

        DocumentResponse response = documentStorageService.uploadDocument(
                file, DocumentType.TITLE_DEED, null, 1L
        );

        assertNotNull(response);
        assertEquals(301L, response.getId());
        assertEquals(10L, response.getOwnerProfileId());
        assertNull(response.getPropertyId());
        assertEquals(DocumentType.TITLE_DEED, response.getDocumentType());
        assertEquals("title_deed.pdf", response.getOriginalFilename());
        assertEquals("application/pdf", response.getContentType());
        assertEquals(DocumentStatus.UPLOADED, response.getStatus());

        ArgumentCaptor<Document> captor = ArgumentCaptor.forClass(Document.class);
        verify(documentRepository).saveAndFlush(captor.capture());
        Document savedEntity = captor.getValue();
        assertTrue(savedEntity.getStorageKey().startsWith("docs/"));
        assertTrue(savedEntity.getStorageKey().endsWith(".pdf"));

        Path physicalFile = documentStorageService.resolvePhysicalPath(savedEntity.getStorageKey());
        assertTrue(Files.exists(physicalFile));
    }

    @Test
    @DisplayName("Upload valid JPEG succeeds with .jpg extension")
    void uploadValidJpeg_Success() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> {
            Document doc = inv.getArgument(0);
            doc.setId(302L);
            return doc;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "id_card.jpeg", "image/jpeg", VALID_JPEG_BYTES
        );

        DocumentResponse response = documentStorageService.uploadDocument(
                file, DocumentType.IDENTITY_PROOF, null, 1L
        );

        assertNotNull(response);
        assertEquals(DocumentType.IDENTITY_PROOF, response.getDocumentType());

        ArgumentCaptor<Document> captor = ArgumentCaptor.forClass(Document.class);
        verify(documentRepository).saveAndFlush(captor.capture());
        assertTrue(captor.getValue().getStorageKey().endsWith(".jpg"));
    }

    @Test
    @DisplayName("Upload valid PNG succeeds with .png extension")
    void uploadValidPng_Success() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> {
            Document doc = inv.getArgument(0);
            doc.setId(303L);
            return doc;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "tax_receipt.png", "image/png", VALID_PNG_BYTES
        );

        DocumentResponse response = documentStorageService.uploadDocument(
                file, DocumentType.PROPERTY_TAX_RECEIPT, null, 1L
        );

        assertNotNull(response);
        assertEquals(DocumentType.PROPERTY_TAX_RECEIPT, response.getDocumentType());

        ArgumentCaptor<Document> captor = ArgumentCaptor.forClass(Document.class);
        verify(documentRepository).saveAndFlush(captor.capture());
        assertTrue(captor.getValue().getStorageKey().endsWith(".png"));
    }

    @Test
    @DisplayName("Upload with valid property association succeeds")
    void uploadWithPropertyAssociation_Success() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(ownerProperty));
        when(documentRepository.saveAndFlush(any(Document.class))).thenAnswer(inv -> {
            Document doc = inv.getArgument(0);
            doc.setId(304L);
            return doc;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "electricity_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        DocumentResponse response = documentStorageService.uploadDocument(
                file, DocumentType.ELECTRICITY_BILL, 100L, 1L
        );

        assertNotNull(response);
        assertEquals(100L, response.getPropertyId());
        assertEquals(DocumentType.ELECTRICITY_BILL, response.getDocumentType());
    }

    @Test
    @DisplayName("Upload with unowned property throws AccessDeniedException")
    void uploadWithUnownedProperty_ThrowsAccessDenied() {
        Property unownedProperty = Property.builder()
                .id(200L)
                .ownerProfile(otherOwnerProfile)
                .build();

        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));
        when(propertyRepository.findById(200L)).thenReturn(Optional.of(unownedProperty));

        MockMultipartFile file = new MockMultipartFile(
                "file", "bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        assertThrows(AccessDeniedException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.ELECTRICITY_BILL, 200L, 1L)
        );
    }

    @Test
    @DisplayName("Upload fails when file exceeds 20MB limit")
    void uploadExceeds20Mb_ThrowsException() {
        byte[] largeBytes = new byte[20 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge.pdf", "application/pdf", largeBytes
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.IDENTITY_PROOF, null, 1L)
        );
        assertTrue(ex.getMessage().contains("exceeds maximum allowed limit of 20MB"));
    }

    @Test
    @DisplayName("Upload fails when file is empty")
    void uploadEmptyFile_ThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.pdf", "application/pdf", new byte[0]
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.IDENTITY_PROOF, null, 1L)
        );
        assertTrue(ex.getMessage().contains("File cannot be empty"));
    }

    @Test
    @DisplayName("Upload fails when MIME type is not allowed")
    void uploadDisallowedMimeType_ThrowsException() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));

        MockMultipartFile file = new MockMultipartFile(
                "file", "script.sh", "text/plain", new byte[]{0x23, 0x21, 0x2F, 0x62}
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.IDENTITY_PROOF, null, 1L)
        );
        assertTrue(ex.getMessage().contains("Unsupported media type"));
    }

    @Test
    @DisplayName("Upload fails when magic bytes do not match declared PDF")
    void uploadInvalidMagicBytes_ThrowsException() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));

        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.pdf", "application/pdf", new byte[]{0x00, 0x01, 0x02, 0x03}
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.IDENTITY_PROOF, null, 1L)
        );
        assertTrue(ex.getMessage().contains("magic bytes inspection failed"));
    }

    @Test
    @DisplayName("Upload fails when MIME type is PDF but magic bytes are JPEG")
    void uploadMimeMagicMismatch_ThrowsException() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));

        MockMultipartFile file = new MockMultipartFile(
                "file", "mismatch.pdf", "application/pdf", VALID_JPEG_BYTES
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.IDENTITY_PROOF, null, 1L)
        );
        assertTrue(ex.getMessage().contains("does not match file magic bytes"));
    }

    @Test
    @DisplayName("CRITICAL Orphan-File Rule: Physical file deleted immediately when DB save fails")
    void orphanFileRule_DeletesDiskFileOnDbFailure() {
        when(ownerProfileRepository.findByUserId(1L)).thenReturn(Optional.of(ownerProfile));
        when(documentRepository.saveAndFlush(any(Document.class)))
                .thenThrow(new RuntimeException("Simulated DB connection drop"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "passport.pdf", "application/pdf", VALID_PDF_BYTES
        );

        assertThrows(RuntimeException.class, () ->
                documentStorageService.uploadDocument(file, DocumentType.IDENTITY_PROOF, null, 1L)
        );

        try {
            long fileCount = Files.walk(tempDocDir)
                    .filter(Files::isRegularFile)
                    .count();
            assertEquals(0L, fileCount, "Orphaned physical file must be deleted when DB save fails");
        } catch (IOException e) {
            fail("IO Error checking temp doc dir: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("Streaming download by owner succeeds and does NOT create audit entry")
    void getDownloadResource_Owner_Success() throws IOException {
        String storageKey = "docs/test-owner-doc.pdf";
        Path path = documentStorageService.resolvePhysicalPath(storageKey);
        Files.createDirectories(path.getParent());
        Files.write(path, VALID_PDF_BYTES);

        Document doc = Document.builder()
                .id(401L)
                .ownerProfile(ownerProfile)
                .storageKey(storageKey)
                .originalFilename("aadhaar.pdf")
                .contentType("application/pdf")
                .status(DocumentStatus.UPLOADED)
                .build();

        when(documentRepository.findById(401L)).thenReturn(Optional.of(doc));

        DownloadResource result = documentStorageService.getDownloadResource(
                401L, 1L, false, "192.168.1.1"
        );

        assertNotNull(result);
        assertEquals("application/pdf", result.contentType());
        assertEquals("aadhaar.pdf", result.originalFilename());
        assertTrue(result.resource().exists());

        verify(adminActionRepository, never()).save(any(AdminAction.class));
    }

    @Test
    @DisplayName("Streaming download by admin succeeds and CREATES audit log entry")
    void getDownloadResource_Admin_LogsAuditEntry() throws IOException {
        String storageKey = "docs/test-admin-doc.pdf";
        Path path = documentStorageService.resolvePhysicalPath(storageKey);
        Files.createDirectories(path.getParent());
        Files.write(path, VALID_PDF_BYTES);

        Document doc = Document.builder()
                .id(402L)
                .ownerProfile(ownerProfile)
                .storageKey(storageKey)
                .originalFilename("deed.pdf")
                .contentType("application/pdf")
                .status(DocumentStatus.UNDER_REVIEW)
                .build();

        when(documentRepository.findById(402L)).thenReturn(Optional.of(doc));
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        DownloadResource result = documentStorageService.getDownloadResource(
                402L, 99L, true, "10.0.0.5"
        );

        assertNotNull(result);
        assertEquals("deed.pdf", result.originalFilename());

        ArgumentCaptor<AdminAction> captor = ArgumentCaptor.forClass(AdminAction.class);
        verify(adminActionRepository, times(1)).save(captor.capture());

        AdminAction audit = captor.getValue();
        assertEquals(adminUser, audit.getAdmin());
        assertEquals("DOCUMENT", audit.getTargetType());
        assertEquals(402L, audit.getTargetId());
        assertEquals("ADMIN_DOCUMENT_DOWNLOAD", audit.getAction());
        assertEquals("10.0.0.5", audit.getIpAddress());
    }

    @Test
    @DisplayName("Streaming download by unauthorized user throws AccessDeniedException")
    void getDownloadResource_Unauthorized_ThrowsAccessDenied() {
        Document doc = Document.builder()
                .id(403L)
                .ownerProfile(ownerProfile)
                .storageKey("docs/secret.pdf")
                .build();

        when(documentRepository.findById(403L)).thenReturn(Optional.of(doc));

        // User 2L is not the owner (1L) and not admin
        assertThrows(AccessDeniedException.class, () ->
                documentStorageService.getDownloadResource(403L, 2L, false, "1.2.3.4")
        );

        verify(adminActionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Streaming download throws ResourceNotFoundException if file missing on disk")
    void getDownloadResource_FileMissingOnDisk_ThrowsNotFound() {
        Document doc = Document.builder()
                .id(404L)
                .ownerProfile(ownerProfile)
                .storageKey("docs/non_existent.pdf")
                .build();

        when(documentRepository.findById(404L)).thenReturn(Optional.of(doc));

        assertThrows(ResourceNotFoundException.class, () ->
                documentStorageService.getDownloadResource(404L, 1L, false, "127.0.0.1")
        );
    }

    @Test
    @DisplayName("Delete document removes DB record and physical file from disk")
    void deleteDocument_Unverified_DeletesDbAndDiskFile() throws IOException {
        String storageKey = "docs/to_delete.pdf";
        Path path = documentStorageService.resolvePhysicalPath(storageKey);
        Files.createDirectories(path.getParent());
        Files.write(path, VALID_PDF_BYTES);
        assertTrue(Files.exists(path));

        Document doc = Document.builder()
                .id(501L)
                .ownerProfile(ownerProfile)
                .storageKey(storageKey)
                .status(DocumentStatus.UPLOADED)
                .build();

        when(documentRepository.findById(501L)).thenReturn(Optional.of(doc));

        documentStorageService.deleteDocument(501L, 1L);

        verify(documentRepository, times(1)).delete(doc);
        verify(documentRepository, times(1)).flush();
        assertFalse(Files.exists(path), "Physical file must be deleted upon document deletion");
    }

    @Test
    @DisplayName("Delete verified document throws IllegalStateException")
    void deleteDocument_Verified_ThrowsIllegalState() {
        Document doc = Document.builder()
                .id(502L)
                .ownerProfile(ownerProfile)
                .storageKey("docs/verified.pdf")
                .status(DocumentStatus.VERIFIED)
                .build();

        when(documentRepository.findById(502L)).thenReturn(Optional.of(doc));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                documentStorageService.deleteDocument(502L, 1L)
        );
        assertTrue(ex.getMessage().contains("Verified documents cannot be deleted"));
        verify(documentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Delete document by non-owner throws AccessDeniedException")
    void deleteDocument_NonOwner_ThrowsAccessDenied() {
        Document doc = Document.builder()
                .id(503L)
                .ownerProfile(ownerProfile)
                .storageKey("docs/doc.pdf")
                .status(DocumentStatus.UPLOADED)
                .build();

        when(documentRepository.findById(503L)).thenReturn(Optional.of(doc));

        assertThrows(AccessDeniedException.class, () ->
                documentStorageService.deleteDocument(503L, 2L)
        );
        verify(documentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Get owner documents returns mapped DTO list")
    void getOwnerDocuments_ReturnsList() {
        Document doc1 = Document.builder()
                .id(601L)
                .ownerProfile(ownerProfile)
                .documentType(DocumentType.IDENTITY_PROOF)
                .originalFilename("id.pdf")
                .status(DocumentStatus.UPLOADED)
                .build();

        Document doc2 = Document.builder()
                .id(602L)
                .ownerProfile(ownerProfile)
                .documentType(DocumentType.TITLE_DEED)
                .originalFilename("deed.pdf")
                .status(DocumentStatus.UNDER_REVIEW)
                .build();

        when(documentRepository.findByOwnerProfileUserId(1L)).thenReturn(List.of(doc1, doc2));

        List<DocumentResponse> result = documentStorageService.getOwnerDocuments(1L);

        assertEquals(2, result.size());
        assertEquals(601L, result.get(0).getId());
        assertEquals(602L, result.get(1).getId());
    }
}
