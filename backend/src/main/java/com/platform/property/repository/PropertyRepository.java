package com.platform.property.repository;

import com.platform.property.entity.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    Optional<Property> findByIdAndOwnerProfileUserId(Long propertyId, Long userId);

    Page<Property> findAllByOwnerProfileUserId(Long userId, Pageable pageable);

    @Query("SELECT p FROM Property p WHERE p.ownerProfile.user.id = :userId AND CAST(p.status AS string) = :status")
    Page<Property> findAllByOwnerProfileUserIdAndStatus(@Param("userId") Long userId, @Param("status") String status, Pageable pageable);

    boolean existsByIdAndOwnerProfileUserId(Long propertyId, Long userId);
}
