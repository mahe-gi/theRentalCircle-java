package com.platform.owner.dto;

import com.platform.owner.entity.OwnerProfile;
import com.platform.owner.entity.OwnershipType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerProfileResponse {

    private Long id;
    private Long userId;
    private OwnershipType ownershipType;
    private String companyName;
    private boolean declarationAccepted;
    private Instant declarationAcceptedAt;
    private String declarationVersion;
    private com.platform.owner.entity.VerificationStatus verificationStatus;
    private Long verifiedBy;
    private Instant verifiedAt;
    private String adminRemarks;

    public static OwnerProfileResponse fromEntity(OwnerProfile profile) {
        if (profile == null) {
            return null;
        }
        return OwnerProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser() != null ? profile.getUser().getId() : null)
                .ownershipType(profile.getOwnershipType())
                .companyName(profile.getCompanyName())
                .declarationAccepted(profile.isDeclarationAccepted())
                .declarationAcceptedAt(profile.getDeclarationAcceptedAt())
                .declarationVersion(profile.getDeclarationVersion())
                .verificationStatus(profile.getVerificationStatus())
                .verifiedBy(profile.getVerifiedBy() != null ? profile.getVerifiedBy().getId() : null)
                .verifiedAt(profile.getVerifiedAt())
                .adminRemarks(profile.getAdminRemarks())
                .build();
    }
}
