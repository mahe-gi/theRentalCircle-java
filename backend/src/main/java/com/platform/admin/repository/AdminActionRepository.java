package com.platform.admin.repository;

import com.platform.admin.entity.AdminAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminActionRepository extends JpaRepository<AdminAction, Long> {
    List<AdminAction> findByTargetTypeAndTargetId(String targetType, Long targetId);
    List<AdminAction> findByAdminId(Long adminId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"admin"})
    org.springframework.data.domain.Page<AdminAction> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);
}
