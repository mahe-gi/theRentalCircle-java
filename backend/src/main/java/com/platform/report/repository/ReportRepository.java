package com.platform.report.repository;

import com.platform.report.entity.Report;
import com.platform.report.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    Page<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId, Pageable pageable);

    Page<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(ReportStatus status);

    @Modifying
    @Query("DELETE FROM Report r WHERE r.property.id IN :propertyIds")
    void deleteByPropertyIds(@Param("propertyIds") List<Long> propertyIds);

    @Modifying
    @Query("DELETE FROM Report r WHERE r.reportedUser.id = :userId")
    void deleteByReportedUserId(@Param("userId") Long userId);
}
