package com.platform.property.repository;

import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    Optional<Property> findByIdAndOwnerProfileUserId(Long propertyId, Long userId);

    Page<Property> findAllByOwnerProfileUserId(Long userId, Pageable pageable);

    @Query("SELECT p FROM Property p WHERE p.ownerProfile.user.id = :userId AND CAST(p.status AS string) = :status")
    Page<Property> findAllByOwnerProfileUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status, Pageable pageable);

    boolean existsByIdAndOwnerProfileUserId(Long propertyId, Long userId);

    @Modifying
    @Query("UPDATE Property p SET p.status = :newStatus, p.reviewedBy = :admin, p.reviewedAt = :now, p.adminRemarks = :remarks, p.updatedAt = :now WHERE p.id = :id AND p.status IN ('SUBMITTED', 'UNDER_REVIEW')")
    int updatePropertyStatusIfInReview(@Param("id") Long id, @Param("newStatus") PropertyStatus newStatus, @Param("admin") User admin, @Param("now") Instant now, @Param("remarks") String remarks);

    List<Property> findByOwnerProfileId(Long ownerProfileId);

    List<Property> findByOwnerProfileIdAndStatus(Long ownerProfileId, PropertyStatus status);

    Page<Property> findAllByStatus(PropertyStatus status, Pageable pageable);
}
