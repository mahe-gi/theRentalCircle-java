package com.platform.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardResponse {
    private long totalUsers;
    private long totalOwners;
    private long verifiedOwners;
    private long pendingOwners;
    private long liveProperties;
    private long pendingProperties;
    private long openReports;
    private long totalVisits;
    private long totalEnquiries;
}
