package com.platform.contact.repository;

import com.platform.contact.entity.ContactEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContactEventRepository extends JpaRepository<ContactEvent, Long> {
    List<ContactEvent> findByUserId(Long userId);
    List<ContactEvent> findByPropertyId(Long propertyId);
    long countByPropertyId(Long propertyId);
}
