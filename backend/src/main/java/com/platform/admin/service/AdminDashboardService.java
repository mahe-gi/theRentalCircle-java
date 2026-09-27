package com.platform.admin.service;

import com.platform.admin.dto.AdminDashboardResponse;
import com.platform.enquiry.repository.EnquiryRepository;
import com.platform.owner.entity.VerificationStatus;
import com.platform.owner.repository.OwnerProfileRepository;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.repository.PropertyRepository;
import com.platform.report.entity.ReportStatus;
import com.platform.report.repository.ReportRepository;
import com.platform.user.repository.UserRepository;
import com.platform.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final OwnerProfileRepository ownerProfileRepository;
    private final PropertyRepository propertyRepository;
    private final ReportRepository reportRepository;
    private final VisitRepository visitRepository;
    private final EnquiryRepository enquiryRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardMetrics() {
        return AdminDashboardResponse.builder()
                .totalUsers(userRepository.count())
                .totalOwners(ownerProfileRepository.count())
                .verifiedOwners(ownerProfileRepository.countByVerificationStatus(VerificationStatus.VERIFIED))
                .pendingOwners(ownerProfileRepository.countByVerificationStatus(VerificationStatus.SUBMITTED))
                .liveProperties(propertyRepository.countByStatus(PropertyStatus.LIVE))
                .pendingProperties(propertyRepository.countByStatus(PropertyStatus.SUBMITTED))
                .openReports(reportRepository.countByStatus(ReportStatus.OPEN))
                .totalVisits(visitRepository.count())
                .totalEnquiries(enquiryRepository.count())
                .build();
    }
}
