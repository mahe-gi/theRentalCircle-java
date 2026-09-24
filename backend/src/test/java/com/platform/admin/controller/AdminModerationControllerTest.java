package com.platform.admin.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.admin.dto.ModerationDecisionRequest;
import com.platform.admin.service.AdminModerationService;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.exception.ConflictException;
import com.platform.common.exception.GlobalExceptionHandler;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.OwnershipType;
import com.platform.owner.entity.VerificationStatus;
import com.platform.property.dto.PropertyDetailResponse;
import com.platform.property.dto.PropertyResponse;
import com.platform.property.entity.ListingType;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.entity.PropertyType;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminModerationControllerTest {

    @Mock
    private AdminModerationService adminModerationService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminModerationController adminModerationController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private UserPrincipal adminPrincipal;
    private User adminUser;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

        adminPrincipal = UserPrincipal.builder()
                .id(99L)
                .email("admin@platform.com")
                .password("encoded_pass")
                .isActive(true)
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .build();

        adminUser = User.builder()
                .id(99L)
                .email("admin@platform.com")
                .firstName("Admin")
                .lastName("User")
                .build();

        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                                          ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest,
                                          WebDataBinderFactory binderFactory) {
                return adminPrincipal;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(adminModerationController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver, new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/admin/owners returns 200 with paged owner profiles")
    void testListOwners() throws Exception {
        OwnerProfileResponse owner = OwnerProfileResponse.builder()
                .id(1L)
                .userId(10L)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .verificationStatus(VerificationStatus.SUBMITTED)
                .build();

        when(adminModerationService.listOwners(eq(VerificationStatus.SUBMITTED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(owner)));

        mockMvc.perform(get("/api/v1/admin/owners")
                        .param("status", "SUBMITTED")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content[0].id", is(1)))
                .andExpect(jsonPath("$.data.content[0].verificationStatus", is("SUBMITTED")));
    }

    @Test
    @DisplayName("GET /api/v1/admin/owners/{id} returns 200 with owner profile")
    void testGetOwner() throws Exception {
        OwnerProfileResponse owner = OwnerProfileResponse.builder()
                .id(1L)
                .userId(10L)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .verificationStatus(VerificationStatus.SUBMITTED)
                .build();

        when(adminModerationService.getOwner(1L)).thenReturn(owner);

        mockMvc.perform(get("/api/v1/admin/owners/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(1)));
    }

    @Test
    @DisplayName("GET /api/v1/admin/owners/{id} returns 404 when owner not found")
    void testGetOwnerNotFound() throws Exception {
        when(adminModerationService.getOwner(999L))
                .thenThrow(new ResourceNotFoundException("Owner profile not found with ID: 999"));

        mockMvc.perform(get("/api/v1/admin/owners/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/owners/{id}/verify returns 200 on success")
    void testVerifyOwnerSuccess() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        OwnerProfileResponse verifiedOwner = OwnerProfileResponse.builder()
                .id(1L)
                .verificationStatus(VerificationStatus.VERIFIED)
                .adminRemarks("Documents verified")
                .verifiedAt(Instant.now())
                .build();

        when(adminModerationService.verifyOwner(eq(1L), eq(adminUser), eq("Documents verified")))
                .thenReturn(verifiedOwner);

        ModerationDecisionRequest request = ModerationDecisionRequest.builder()
                .remarks("Documents verified")
                .build();

        mockMvc.perform(put("/api/v1/admin/owners/1/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.verificationStatus", is("VERIFIED")))
                .andExpect(jsonPath("$.data.adminRemarks", is("Documents verified")));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/owners/{id}/verify returns 409 Conflict when concurrent decision detected")
    void testVerifyOwnerConflict() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        when(adminModerationService.verifyOwner(eq(1L), eq(adminUser), any()))
                .thenThrow(new ConflictException("Owner verification has already been processed or is not in review"));

        mockMvc.perform(put("/api/v1/admin/owners/1/verify")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Owner verification has already been processed or is not in review")));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/owners/{id}/reject returns 200 on success")
    void testRejectOwnerSuccess() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        OwnerProfileResponse rejectedOwner = OwnerProfileResponse.builder()
                .id(1L)
                .verificationStatus(VerificationStatus.REJECTED)
                .adminRemarks("Fraudulent PAN card")
                .build();

        when(adminModerationService.rejectOwner(eq(1L), eq(adminUser), eq("Fraudulent PAN card")))
                .thenReturn(rejectedOwner);

        ModerationDecisionRequest request = ModerationDecisionRequest.builder()
                .remarks("Fraudulent PAN card")
                .build();

        mockMvc.perform(put("/api/v1/admin/owners/1/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.verificationStatus", is("REJECTED")));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/owners/{id}/request-info returns 200 on success")
    void testRequestMoreInfoOwnerSuccess() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        OwnerProfileResponse response = OwnerProfileResponse.builder()
                .id(1L)
                .verificationStatus(VerificationStatus.MORE_INFORMATION_REQUIRED)
                .adminRemarks("Upload clearer photo")
                .build();

        when(adminModerationService.requestMoreInfoOwner(eq(1L), eq(adminUser), eq("Upload clearer photo")))
                .thenReturn(response);

        ModerationDecisionRequest request = ModerationDecisionRequest.builder()
                .remarks("Upload clearer photo")
                .build();

        mockMvc.perform(put("/api/v1/admin/owners/1/request-info")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.verificationStatus", is("MORE_INFORMATION_REQUIRED")));
    }

    @Test
    @DisplayName("GET /api/v1/admin/properties returns 200 with paged property responses")
    void testListProperties() throws Exception {
        PropertyResponse property = PropertyResponse.builder()
                .id(10L)
                .title("2BHK Apartment")
                .status(PropertyStatus.SUBMITTED)
                .propertyType(PropertyType.APARTMENT)
                .listingType(ListingType.RENT)
                .price(new BigDecimal("18000.00"))
                .build();

        when(adminModerationService.listProperties(eq(PropertyStatus.SUBMITTED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(property)));

        mockMvc.perform(get("/api/v1/admin/properties")
                        .param("status", "SUBMITTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.content[0].id", is(10)))
                .andExpect(jsonPath("$.data.content[0].status", is("SUBMITTED")));
    }

    @Test
    @DisplayName("GET /api/v1/admin/properties/{id} returns 200 with property details")
    void testGetProperty() throws Exception {
        PropertyDetailResponse property = PropertyDetailResponse.builder()
                .id(10L)
                .title("2BHK Apartment")
                .status(PropertyStatus.SUBMITTED)
                .build();

        when(adminModerationService.getProperty(10L)).thenReturn(property);

        mockMvc.perform(get("/api/v1/admin/properties/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(10)));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/properties/{id}/approve returns 200 on success")
    void testApprovePropertySuccess() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        PropertyResponse response = PropertyResponse.builder()
                .id(10L)
                .title("2BHK Apartment")
                .status(PropertyStatus.LIVE)
                .adminRemarks("Approved and owner is verified")
                .build();

        when(adminModerationService.approveProperty(eq(10L), eq(adminUser), eq("Approved and owner is verified")))
                .thenReturn(response);

        ModerationDecisionRequest request = ModerationDecisionRequest.builder()
                .remarks("Approved and owner is verified")
                .build();

        mockMvc.perform(put("/api/v1/admin/properties/10/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("LIVE")));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/properties/{id}/approve returns 409 Conflict when concurrent decision detected")
    void testApprovePropertyConflict() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        when(adminModerationService.approveProperty(eq(10L), eq(adminUser), any()))
                .thenThrow(new ConflictException("Property moderation has already been processed or is not in review"));

        mockMvc.perform(put("/api/v1/admin/properties/10/approve"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Property moderation has already been processed or is not in review")));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/properties/{id}/reject returns 200 on success")
    void testRejectPropertySuccess() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        PropertyResponse response = PropertyResponse.builder()
                .id(10L)
                .status(PropertyStatus.REJECTED)
                .adminRemarks("Misleading photos")
                .build();

        when(adminModerationService.rejectProperty(eq(10L), eq(adminUser), eq("Misleading photos")))
                .thenReturn(response);

        ModerationDecisionRequest request = ModerationDecisionRequest.builder()
                .remarks("Misleading photos")
                .build();

        mockMvc.perform(put("/api/v1/admin/properties/10/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("REJECTED")));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/properties/{id}/request-info returns 200 on success")
    void testRequestMoreInfoPropertySuccess() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        PropertyResponse response = PropertyResponse.builder()
                .id(10L)
                .status(PropertyStatus.MORE_INFORMATION_REQUIRED)
                .adminRemarks("Missing bathroom photos")
                .build();

        when(adminModerationService.requestMoreInfoProperty(eq(10L), eq(adminUser), eq("Missing bathroom photos")))
                .thenReturn(response);

        ModerationDecisionRequest request = ModerationDecisionRequest.builder()
                .remarks("Missing bathroom photos")
                .build();

        mockMvc.perform(put("/api/v1/admin/properties/10/request-info")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("MORE_INFORMATION_REQUIRED")));
    }
}
