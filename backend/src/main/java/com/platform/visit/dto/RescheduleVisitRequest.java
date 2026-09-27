package com.platform.visit.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleVisitRequest {

    @NotNull(message = "Rescheduled date is required")
    @FutureOrPresent(message = "Rescheduled date must be today or in the future")
    private LocalDate rescheduledDate;

    @NotNull(message = "Rescheduled time is required")
    private LocalTime rescheduledTime;

    private String ownerRemarks;
}
