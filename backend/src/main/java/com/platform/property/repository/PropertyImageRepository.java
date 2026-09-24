package com.platform.property.repository;

import com.platform.property.entity.PropertyImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyImageRepository extends JpaRepository<PropertyImage, Long> {

    @Query("SELECT i FROM PropertyImage i WHERE i.property.id = :propertyId ORDER BY i.displayOrder ASC")
    List<PropertyImage> findByPropertyIdOrderByDisplayOrderAsc(@Param("propertyId") Long propertyId);

    @Query("SELECT i FROM PropertyImage i WHERE i.id = :imageId AND i.property.id = :propertyId")
    Optional<PropertyImage> findByIdAndPropertyId(@Param("imageId") Long imageId, @Param("propertyId") Long propertyId);

    @Query("SELECT COUNT(i) > 0 FROM PropertyImage i WHERE i.property.id = :propertyId")
    boolean existsByPropertyId(@Param("propertyId") Long propertyId);

    @Query("SELECT COUNT(i) FROM PropertyImage i WHERE i.property.id = :propertyId")
    long countByPropertyId(@Param("propertyId") Long propertyId);

    @Query("SELECT i FROM PropertyImage i WHERE i.property.id = :propertyId")
    List<PropertyImage> findByPropertyId(@Param("propertyId") Long propertyId);

    @Modifying
    @Query("DELETE FROM PropertyImage i WHERE i.property.id = :propertyId")
    void deleteByPropertyId(@Param("propertyId") Long propertyId);

    @Modifying
    @Query("UPDATE PropertyImage i SET i.isPrimary = false WHERE i.property.id = :propertyId")
    void resetPrimaryForProperty(@Param("propertyId") Long propertyId);

    @Modifying
    @Query("UPDATE PropertyImage i SET i.isPrimary = true WHERE i.id = :imageId AND i.property.id = :propertyId")
    int setPrimaryImage(@Param("propertyId") Long propertyId, @Param("imageId") Long imageId);
}

