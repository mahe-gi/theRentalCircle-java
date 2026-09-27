package com.platform.visit.repository;

import com.platform.visit.entity.Visit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VisitRepository extends JpaRepository<Visit, Long> {

    Page<Visit> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Visit> findByPropertyOwnerProfileUserIdOrderByCreatedAtDesc(Long ownerUserId, Pageable pageable);

    Optional<Visit> findByIdAndUserId(Long id, Long userId);

    Optional<Visit> findByIdAndPropertyOwnerProfileUserId(Long id, Long ownerUserId);

    long countByPropertyOwnerProfileUserId(Long ownerUserId);
}
