package com.platform.report.dto;

import com.platform.report.entity.ReportReason;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportRequest {

    private Long propertyId;
    private Long reportedUserId;

    @NotNull(message = "Reason is required")
    private ReportReason reason;

    private String description;
}
