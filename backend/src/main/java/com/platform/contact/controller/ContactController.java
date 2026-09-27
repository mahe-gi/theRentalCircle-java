package com.platform.contact.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.dto.ApiResponse;
import com.platform.contact.dto.ContactResponse;
import com.platform.contact.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/properties")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @PostMapping("/{id}/contact")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ContactResponse>> contactOwner(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContactResponse response = contactService.initiateWhatsAppContact(principal.getUser(), id);
        return ResponseEntity.ok(ApiResponse.success("Contact link generated successfully", response));
    }
}
