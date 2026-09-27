package com.platform.report.dto;

import com.platform.report.entity.ResolutionAction;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveReportRequest {

    @NotNull(message = "Resolution action is required")
    private ResolutionAction action;

    private String notes;
}
