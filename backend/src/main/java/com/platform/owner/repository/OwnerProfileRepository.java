package com.platform.owner.repository;

import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.VerificationStatus;
import com.platform.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface OwnerProfileRepository extends JpaRepository<OwnerProfile, Long> {

    Optional<OwnerProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    @Modifying
    @Query("UPDATE OwnerProfile o SET o.verificationStatus = :newStatus, o.verifiedBy = :admin, o.verifiedAt = :now, o.adminRemarks = :remarks, o.updatedAt = :now WHERE o.id = :id AND o.verificationStatus IN ('SUBMITTED', 'UNDER_REVIEW')")
    int updateVerificationStatusIfInReview(@Param("id") Long id, @Param("newStatus") VerificationStatus newStatus, @Param("admin") User admin, @Param("now") Instant now, @Param("remarks") String remarks);

    Page<OwnerProfile> findAllByVerificationStatus(VerificationStatus verificationStatus, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM documents WHERE owner_profile_id = :ownerProfileId", nativeQuery = true)
    long countDocumentsByOwnerProfileId(@Param("ownerProfileId") Long ownerProfileId);
}
