package com.platform.document.repository;

import com.platform.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByOwnerProfileId(Long ownerProfileId);

    List<Document> findByOwnerProfileUserId(Long userId);

    Optional<Document> findByIdAndOwnerProfileUserId(Long id, Long userId);

    long countByOwnerProfileUserId(Long userId);
}
