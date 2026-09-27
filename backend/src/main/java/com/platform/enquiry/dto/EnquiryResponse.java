package com.platform.enquiry.dto;

import com.platform.enquiry.entity.Enquiry;
import com.platform.enquiry.entity.EnquiryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class EnquiryResponse {
    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userMobile;
    private String message;
    private EnquiryStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    public static EnquiryResponse fromEntity(Enquiry e) {
        return EnquiryResponse.builder()
                .id(e.getId())
                .propertyId(e.getProperty().getId())
                .propertyTitle(e.getProperty().getTitle())
                .userId(e.getUser().getId())
                .userName(e.getUser().getFirstName() + " " + e.getUser().getLastName())
                .userEmail(e.getUser().getEmail())
                .userMobile(e.getUser().getMobile())
                .message(e.getMessage())
                .status(e.getStatus())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
