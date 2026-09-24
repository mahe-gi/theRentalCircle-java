package com.platform.document.repository;

import com.platform.document.entity.AdminDocumentAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminDocumentAccessRepository extends JpaRepository<AdminDocumentAccess, Long> {
}
