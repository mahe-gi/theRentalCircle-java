package com.platform.owner.dto;

import com.platform.owner.entity.VerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerVerificationStatusResponse {

    private VerificationStatus verificationStatus;
    private String adminRemarks;
    private Instant verifiedAt;
}
