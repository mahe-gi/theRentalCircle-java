package com.platform.document.service;

import com.platform.document.entity.Document;
import com.platform.document.entity.DocumentStatus;
import com.platform.document.entity.DocumentType;
import com.platform.document.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentCleanupServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    private DocumentCleanupService cleanupService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        cleanupService = new DocumentCleanupService(documentRepository);
        ReflectionTestUtils.setField(cleanupService, "documentDir", tempDir.toString());
        ReflectionTestUtils.setField(cleanupService, "rejectedRetentionDays", 30);
    }

    @Test
    void purgeExpiredRejectedDocuments_deletesPhysicalFileAndDbRecord() throws IOException {
        Path docFile = tempDir.resolve("docs/expired.pdf");
        Files.createDirectories(docFile.getParent());
        Files.writeString(docFile, "dummy content");
        assertThat(Files.exists(docFile)).isTrue();

        Document expiredDoc = Document.builder()
                .id(100L)
                .storageKey("docs/expired.pdf")
                .status(DocumentStatus.REJECTED)
                .documentType(DocumentType.IDENTITY_PROOF)
                .originalFilename("expired.pdf")
                .fileSizeBytes(13L)
                .contentType("application/pdf")
                .updatedAt(Instant.now().minus(35, ChronoUnit.DAYS))
                .build();

        when(documentRepository.findByStatusAndUpdatedAtBefore(eq(DocumentStatus.REJECTED), any(Instant.class)))
                .thenReturn(List.of(expiredDoc));

        int purgedCount = cleanupService.purgeExpiredRejectedDocuments();

        assertThat(purgedCount).isEqualTo(1);
        assertThat(Files.exists(docFile)).isFalse();
        verify(documentRepository, times(1)).delete(expiredDoc);
    }

    @Test
    void purgeAllDocumentsForOwnerProfile_deletesAllOwnerFiles() throws IOException {
        Path doc1 = tempDir.resolve("docs/owner_doc1.pdf");
        Path doc2 = tempDir.resolve("docs/owner_doc2.pdf");
        Files.createDirectories(doc1.getParent());
        Files.writeString(doc1, "content1");
        Files.writeString(doc2, "content2");

        Document d1 = Document.builder().id(1L).storageKey("docs/owner_doc1.pdf").build();
        Document d2 = Document.builder().id(2L).storageKey("docs/owner_doc2.pdf").build();

        when(documentRepository.findAllByOwnerProfileIdOrPropertyOwnerProfileId(50L)).thenReturn(List.of(d1, d2));

        int purgedCount = cleanupService.purgeAllDocumentsForOwnerProfile(50L);

        assertThat(purgedCount).isEqualTo(2);
        assertThat(Files.exists(doc1)).isFalse();
        assertThat(Files.exists(doc2)).isFalse();
        verify(documentRepository, times(1)).delete(d1);
        verify(documentRepository, times(1)).delete(d2);
    }

    @Test
    void purgeAllDocumentsForProperty_deletesAllPropertyAttachedFiles() throws IOException {
        Path propDoc = tempDir.resolve("docs/property_deed.pdf");
        Files.createDirectories(propDoc.getParent());
        Files.writeString(propDoc, "property title deed content");

        Document d = Document.builder().id(3L).storageKey("docs/property_deed.pdf").build();

        when(documentRepository.findByPropertyId(77L)).thenReturn(List.of(d));

        int purgedCount = cleanupService.purgeAllDocumentsForProperty(77L);

        assertThat(purgedCount).isEqualTo(1);
        assertThat(Files.exists(propDoc)).isFalse();
        verify(documentRepository, times(1)).delete(d);
    }
}
