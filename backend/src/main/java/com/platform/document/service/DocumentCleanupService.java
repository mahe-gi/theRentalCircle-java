package com.platform.document.service;

import com.platform.document.entity.Document;
import com.platform.document.entity.DocumentStatus;
import com.platform.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentCleanupService {

    private final DocumentRepository documentRepository;

    @Value("${app.document.dir:/var/app/secure-docs}")
    private String documentDir;

    @Value("${app.document.rejected-retention-days:30}")
    private int rejectedRetentionDays;

    /**
     * Scheduled automated purge of rejected verification documents older than retention period (default 30 days).
     * Deletes physical file from disk and removes database row.
     */
    @Scheduled(cron = "${app.document.cleanup-cron:0 0 2 * * ?}")
    @Transactional
    public int purgeExpiredRejectedDocuments() {
        return purgeExpiredRejectedDocumentsOlderThanDays(rejectedRetentionDays);
    }

    /**
     * Purges rejected documents older than a specified number of days.
     */
    @Transactional
    public int purgeExpiredRejectedDocumentsOlderThanDays(int days) {
        Instant cutoff = Instant.now().minus(days, ChronoUnit.DAYS);
        List<Document> expired = documentRepository.findByStatusAndUpdatedAtBefore(DocumentStatus.REJECTED, cutoff);
        log.info("Found {} expired rejected documents older than {} days (cutoff: {})", expired.size(), days, cutoff);

        int count = 0;
        for (Document doc : expired) {
            deletePhysicalFileAndRecord(doc);
            count++;
        }
        return count;
    }

    /**
     * Purges all documents belonging to an owner profile upon account deletion or erasure request.
     */
    @Transactional
    public int purgeAllDocumentsForOwnerProfile(Long ownerProfileId) {
        List<Document> documents = documentRepository.findByOwnerProfileId(ownerProfileId);
        log.info("Purging all {} documents for owner profile id: {}", documents.size(), ownerProfileId);
        int count = 0;
        for (Document doc : documents) {
            deletePhysicalFileAndRecord(doc);
            count++;
        }
        return count;
    }

    private void deletePhysicalFileAndRecord(Document doc) {
        Path filePath = Paths.get(documentDir, doc.getStorageKey());
        try {
            boolean deleted = Files.deleteIfExists(filePath);
            log.info("Deleted physical file for document id: {} at path: {} (existed: {})", doc.getId(), filePath, deleted);
        } catch (IOException e) {
            log.warn("Failed to delete physical file: {}", filePath, e);
        }
        documentRepository.delete(doc);
    }
}
