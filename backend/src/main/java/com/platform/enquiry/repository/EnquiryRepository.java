package com.platform.enquiry.repository;

import com.platform.enquiry.entity.Enquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EnquiryRepository extends JpaRepository<Enquiry, Long> {

    Page<Enquiry> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Enquiry> findByPropertyOwnerProfileUserIdOrderByCreatedAtDesc(Long ownerUserId, Pageable pageable);

    Optional<Enquiry> findByIdAndPropertyOwnerProfileUserId(Long id, Long ownerUserId);

    long countByPropertyOwnerProfileUserId(Long ownerUserId);
}
