package com.platform.report.service;

import com.platform.admin.entity.AdminAction;
import com.platform.admin.repository.AdminActionRepository;
import com.platform.common.exception.BadRequestException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.notification.service.NotificationService;
import com.platform.property.entity.Property;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.report.dto.CreateReportRequest;
import com.platform.report.dto.ReportResponse;
import com.platform.report.dto.ResolveReportRequest;
import com.platform.report.entity.Report;
import com.platform.report.entity.ReportStatus;
import com.platform.report.entity.ResolutionAction;
import com.platform.report.repository.ReportRepository;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final AdminActionRepository adminActionRepository;
    private final NotificationService notificationService;

    @Transactional
    public ReportResponse createReport(User reporter, CreateReportRequest req) {
        if (req.getPropertyId() == null && req.getReportedUserId() == null) {
            throw new BadRequestException("Either propertyId or reportedUserId must be provided");
        }

        Property property = null;
        if (req.getPropertyId() != null) {
            property = propertyRepository.findById(req.getPropertyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + req.getPropertyId()));
        }

        User reportedUser = null;
        if (req.getReportedUserId() != null) {
            reportedUser = userRepository.findById(req.getReportedUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + req.getReportedUserId()));
        } else if (property != null) {
            reportedUser = property.getOwnerProfile().getUser();
        }

        Report report = Report.builder()
                .reporter(reporter)
                .property(property)
                .reportedUser(reportedUser)
                .reason(req.getReason())
                .description(req.getDescription())
                .status(ReportStatus.OPEN)
                .build();
        reportRepository.save(report);

        return ReportResponse.fromEntity(report);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getMyReports(Long reporterId, Pageable pageable) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId, pageable)
                .map(ReportResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> listReports(ReportStatus status, Pageable pageable) {
        if (status != null) {
            return reportRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                    .map(ReportResponse::fromEntity);
        }
        return reportRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(ReportResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public ReportResponse getReport(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));
        return ReportResponse.fromEntity(report);
    }

    @Transactional
    public ReportResponse investigateReport(Long id, User admin) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        report.setStatus(ReportStatus.UNDER_INVESTIGATION);
        report.setAssignedAdmin(admin);
        reportRepository.save(report);

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("INVESTIGATE_REPORT")
                .targetType("REPORT")
                .targetId(id)
                .details("Investigating report ID: " + id)
                .build());

        return ReportResponse.fromEntity(report);
    }

    @Transactional
    public ReportResponse resolveReport(Long id, User admin, ResolveReportRequest req) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        report.setStatus(ReportStatus.RESOLVED);
        report.setAssignedAdmin(admin);
        report.setResolutionAction(req.getAction());
        report.setResolutionNotes(req.getNotes());
        report.setResolvedAt(Instant.now());
        reportRepository.save(report);

        // Execute action effects
        ResolutionAction action = req.getAction();
        if (report.getProperty() != null) {
            Property prop = report.getProperty();
            if (action == ResolutionAction.HIDE_PROPERTY) {
                prop.setStatus(PropertyStatus.SUSPENDED);
                propertyRepository.save(prop);
            } else if (action == ResolutionAction.REJECT_PROPERTY) {
                prop.setStatus(PropertyStatus.REJECTED);
                propertyRepository.save(prop);
            }
        }

        if (report.getReportedUser() != null) {
            User targetUser = report.getReportedUser();
            if (action == ResolutionAction.SUSPEND_USER || action == ResolutionAction.BLOCK_USER) {
                targetUser.setActive(false);
                userRepository.save(targetUser);
            }
        }

        // Notify reporter of resolution
        notificationService.createNotification(
                report.getReporter().getId(),
                "Report Resolved",
                "Your report has been reviewed and resolved by our trust & safety team.",
                "REPORT_RESOLVED",
                "REPORT",
                id
        );

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("RESOLVE_REPORT")
                .targetType("REPORT")
                .targetId(id)
                .details("Resolved report with action: " + action + ", notes: " + req.getNotes())
                .build());

        return ReportResponse.fromEntity(report);
    }

    @Transactional
    public ReportResponse dismissReport(Long id, User admin, String notes) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        report.setStatus(ReportStatus.DISMISSED);
        report.setAssignedAdmin(admin);
        report.setResolutionAction(ResolutionAction.DISMISS);
        report.setResolutionNotes(notes);
        report.setResolvedAt(Instant.now());
        reportRepository.save(report);

        adminActionRepository.save(AdminAction.builder()
                .admin(admin)
                .action("DISMISS_REPORT")
                .targetType("REPORT")
                .targetId(id)
                .details("Dismissed report with notes: " + notes)
                .build());

        return ReportResponse.fromEntity(report);
    }
}
