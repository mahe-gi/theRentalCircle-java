package com.platform.document.repository;

import com.platform.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByOwnerProfileId(Long ownerProfileId);

    List<Document> findByPropertyId(Long propertyId);

    @Query("SELECT DISTINCT d FROM Document d LEFT JOIN d.ownerProfile op LEFT JOIN d.property p LEFT JOIN p.ownerProfile pop WHERE op.id = :ownerProfileId OR pop.id = :ownerProfileId")
    List<Document> findAllByOwnerProfileIdOrPropertyOwnerProfileId(@Param("ownerProfileId") Long ownerProfileId);

    List<Document> findByOwnerProfileUserId(Long userId);

    Optional<Document> findByIdAndOwnerProfileUserId(Long id, Long userId);

    long countByOwnerProfileUserId(Long userId);

    List<Document> findByStatusAndUpdatedAtBefore(com.platform.document.entity.DocumentStatus status, java.time.Instant cutoff);
}
