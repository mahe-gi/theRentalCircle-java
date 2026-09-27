package com.platform.report.dto;

import com.platform.report.entity.Report;
import com.platform.report.entity.ReportReason;
import com.platform.report.entity.ReportStatus;
import com.platform.report.entity.ResolutionAction;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ReportResponse {
    private Long id;
    private Long reporterId;
    private String reporterName;
    private Long propertyId;
    private String propertyTitle;
    private Long reportedUserId;
    private String reportedUserName;
    private ReportReason reason;
    private String description;
    private ReportStatus status;
    private Long assignedAdminId;
    private String assignedAdminName;
    private ResolutionAction resolutionAction;
    private String resolutionNotes;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant resolvedAt;

    public static ReportResponse fromEntity(Report r) {
        return ReportResponse.builder()
                .id(r.getId())
                .reporterId(r.getReporter().getId())
                .reporterName(r.getReporter().getFirstName() + " " + r.getReporter().getLastName())
                .propertyId(r.getProperty() != null ? r.getProperty().getId() : null)
                .propertyTitle(r.getProperty() != null ? r.getProperty().getTitle() : null)
                .reportedUserId(r.getReportedUser() != null ? r.getReportedUser().getId() : null)
                .reportedUserName(r.getReportedUser() != null ? r.getReportedUser().getFirstName() + " " + r.getReportedUser().getLastName() : null)
                .reason(r.getReason())
                .description(r.getDescription())
                .status(r.getStatus())
                .assignedAdminId(r.getAssignedAdmin() != null ? r.getAssignedAdmin().getId() : null)
                .assignedAdminName(r.getAssignedAdmin() != null ? r.getAssignedAdmin().getFirstName() + " " + r.getAssignedAdmin().getLastName() : null)
                .resolutionAction(r.getResolutionAction())
                .resolutionNotes(r.getResolutionNotes())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .resolvedAt(r.getResolvedAt())
                .build();
    }
}
