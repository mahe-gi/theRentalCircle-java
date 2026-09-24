package com.platform.owner.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.exception.GlobalExceptionHandler;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.owner.dto.CreateOwnerProfileRequest;
import com.platform.owner.dto.OwnerProfileResponse;
import com.platform.owner.entity.OwnershipType;
import com.platform.owner.service.OwnerProfileService;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class OwnerControllerTest {

    @Mock
    private OwnerProfileService ownerProfileService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private OwnerController ownerController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private UserPrincipal ownerPrincipal;
    private User testUser;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

        ownerPrincipal = UserPrincipal.builder()
                .id(1L)
                .email("owner@example.com")
                .password("encoded_pass")
                .isActive(true)
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_OWNER")))
                .build();

        testUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .firstName("John")
                .lastName("Doe")
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
                return ownerPrincipal;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(ownerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/owners/register successfully registers owner and returns 201 Created")
    void testRegisterOwnerSuccess() throws Exception {
        CreateOwnerProfileRequest request = CreateOwnerProfileRequest.builder()
                .ownershipType(OwnershipType.TITLE_OWNER)
                .companyName("Acme Holdings")
                .declarationAccepted(true)
                .build();

        OwnerProfileResponse response = OwnerProfileResponse.builder()
                .id(5L)
                .userId(1L)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .companyName("Acme Holdings")
                .declarationAccepted(true)
                .declarationAcceptedAt(Instant.now())
                .declarationVersion("v1.0")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(ownerProfileService.registerOwner(eq(testUser), any(CreateOwnerProfileRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/owners/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(5))
                .andExpect(jsonPath("$.data.ownershipType").value("TITLE_OWNER"))
                .andExpect(jsonPath("$.data.declarationVersion").value("v1.0"));
    }

    @Test
    @DisplayName("POST /api/v1/owners/register fails validation when declaration is not accepted")
    void testRegisterOwnerValidationFailureDeclarationFalse() throws Exception {
        CreateOwnerProfileRequest request = CreateOwnerProfileRequest.builder()
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(false)
                .build();

        mockMvc.perform(post("/api/v1/owners/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Owner declaration must be accepted")));

        verify(ownerProfileService, never()).registerOwner(any(), any());
    }

    @Test
    @DisplayName("POST /api/v1/owners/register fails validation when ownershipType is null")
    void testRegisterOwnerValidationFailureNullType() throws Exception {
        CreateOwnerProfileRequest request = CreateOwnerProfileRequest.builder()
                .declarationAccepted(true)
                .build();

        mockMvc.perform(post("/api/v1/owners/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Ownership type is required")));

        verify(ownerProfileService, never()).registerOwner(any(), any());
    }

    @Test
    @DisplayName("POST /api/v1/owners/register returns 400 when user is already registered")
    void testRegisterOwnerAlreadyRegistered() throws Exception {
        CreateOwnerProfileRequest request = CreateOwnerProfileRequest.builder()
                .ownershipType(OwnershipType.TITLE_OWNER)
                .declarationAccepted(true)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(ownerProfileService.registerOwner(eq(testUser), any(CreateOwnerProfileRequest.class)))
                .thenThrow(new IllegalStateException("User is already registered as an owner"));

        mockMvc.perform(post("/api/v1/owners/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("already registered")));
    }

    @Test
    @DisplayName("GET /api/v1/owners/profile returns owner profile")
    void testGetProfileSuccess() throws Exception {
        OwnerProfileResponse response = OwnerProfileResponse.builder()
                .id(5L)
                .userId(1L)
                .ownershipType(OwnershipType.TITLE_OWNER)
                .companyName("Acme Holdings")
                .declarationAccepted(true)
                .declarationAcceptedAt(Instant.now())
                .declarationVersion("v1.0")
                .build();

        when(ownerProfileService.getOwnerProfile(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/owners/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(5))
                .andExpect(jsonPath("$.data.ownershipType").value("TITLE_OWNER"));
    }

    @Test
    @DisplayName("GET /api/v1/owners/profile returns 404 when profile not found")
    void testGetProfileNotFound() throws Exception {
        when(ownerProfileService.getOwnerProfile(1L))
                .thenThrow(new ResourceNotFoundException("Owner profile not found for user ID: 1"));

        mockMvc.perform(get("/api/v1/owners/profile"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Owner profile not found")));
    }
}
