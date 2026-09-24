package com.platform.owner.dto;

import com.platform.owner.entity.OwnershipType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOwnerProfileRequest {

    @NotNull(message = "Ownership type is required")
    private OwnershipType ownershipType;

    @Size(max = 255, message = "Company name must not exceed 255 characters")
    private String companyName;

    @NotNull(message = "Declaration acceptance is required")
    @AssertTrue(message = "Owner declaration must be accepted")
    private Boolean declarationAccepted;
}
