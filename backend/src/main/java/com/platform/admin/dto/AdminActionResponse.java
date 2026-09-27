package com.platform.admin.dto;

import com.platform.admin.entity.AdminAction;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminActionResponse {
    private Long id;
    private Long adminId;
    private String adminName;
    private String action;
    private String targetType;
    private Long targetId;
    private String details;
    private String ipAddress;
    private Instant createdAt;

    public static AdminActionResponse fromEntity(AdminAction a) {
        return AdminActionResponse.builder()
                .id(a.getId())
                .adminId(a.getAdmin() != null ? a.getAdmin().getId() : null)
                .adminName(a.getAdmin() != null ? a.getAdmin().getFirstName() + " " + a.getAdmin().getLastName() : "System")
                .action(a.getAction())
                .targetType(a.getTargetType())
                .targetId(a.getTargetId())
                .details(a.getDetails())
                .ipAddress(a.getIpAddress())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
