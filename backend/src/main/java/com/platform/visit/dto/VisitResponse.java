package com.platform.visit.dto;

import com.platform.visit.entity.Visit;
import com.platform.visit.entity.VisitStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class VisitResponse {
    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private String city;
    private String locality;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userMobile;
    private LocalDate preferredDate;
    private LocalTime preferredTime;
    private String message;
    private VisitStatus status;
    private LocalDate rescheduledDate;
    private LocalTime rescheduledTime;
    private String ownerRemarks;
    private Instant createdAt;
    private Instant updatedAt;

    public static VisitResponse fromEntity(Visit v) {
        return VisitResponse.builder()
                .id(v.getId())
                .propertyId(v.getProperty().getId())
                .propertyTitle(v.getProperty().getTitle())
                .city(v.getProperty().getCity())
                .locality(v.getProperty().getLocality())
                .userId(v.getUser().getId())
                .userName(v.getUser().getFirstName() + " " + v.getUser().getLastName())
                .userEmail(v.getUser().getEmail())
                .userMobile(v.getUser().getMobile())
                .preferredDate(v.getPreferredDate())
                .preferredTime(v.getPreferredTime())
                .message(v.getMessage())
                .status(v.getStatus())
                .rescheduledDate(v.getRescheduledDate())
                .rescheduledTime(v.getRescheduledTime())
                .ownerRemarks(v.getOwnerRemarks())
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .build();
    }
}
