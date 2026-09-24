package com.platform.admin.repository;

import com.platform.admin.entity.AdminAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminActionRepository extends JpaRepository<AdminAction, Long> {
    List<AdminAction> findByTargetTypeAndTargetId(String targetType, Long targetId);
    List<AdminAction> findByAdminId(Long adminId);
    long countByTargetTypeAndTargetIdAndAction(String targetType, Long targetId, String action);
}
