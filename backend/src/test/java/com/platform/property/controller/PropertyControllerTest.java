package com.platform.property.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.exception.GlobalExceptionHandler;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.property.dto.*;
import com.platform.property.entity.FurnishingType;
import com.platform.property.entity.ListingType;
import com.platform.property.entity.PropertyStatus;
import com.platform.property.entity.PropertyType;
import com.platform.property.service.PropertyService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PropertyControllerTest {

    @Mock
    private PropertyService propertyService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PropertyController propertyController;

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

        mockMvc = MockMvcBuilders.standaloneSetup(propertyController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver, new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/properties creates draft property and returns 201 Created")
    void testCreateDraftSuccess() throws Exception {
        CreatePropertyRequest request = CreatePropertyRequest.builder()
                .title("Modern 3BHK Apartment")
                .propertyType(PropertyType.APARTMENT)
                .listingType(ListingType.RENT)
                .price(new BigDecimal("35000.00"))
                .state("Karnataka")
                .city("Bengaluru")
                .district("Bengaluru Urban")
                .locality("Koramangala")
                .address("5th Block Koramangala")
                .pincode("560095")
                .amenities(List.of("Gym", "Security"))
                .build();

        PropertyDetailResponse response = PropertyDetailResponse.builder()
                .id(50L)
                .title("Modern 3BHK Apartment")
                .propertyType(PropertyType.APARTMENT)
                .listingType(ListingType.RENT)
                .price(new BigDecimal("35000.00"))
                .district("Bengaluru Urban")
                .status(PropertyStatus.DRAFT)
                .amenities(List.of("Gym", "Security"))
                .createdAt(Instant.now())
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(propertyService.createDraft(eq(testUser), any(CreatePropertyRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/properties")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(50))
                .andExpect(jsonPath("$.data.title").value("Modern 3BHK Apartment"))
                .andExpect(jsonPath("$.data.district").value("Bengaluru Urban"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    @DisplayName("POST /api/v1/properties fails validation when mandatory fields like title or district are missing")
    void testCreateDraftValidationFailure() throws Exception {
        CreatePropertyRequest request = CreatePropertyRequest.builder()
                .title("") // empty title
                .price(new BigDecimal("-100.00")) // negative price
                .build();

        mockMvc.perform(post("/api/v1/properties")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(propertyService, never()).createDraft(any(), any());
    }

    @Test
    @DisplayName("GET /api/v1/properties/{id} returns owner's property details")
    void testGetPropertySuccess() throws Exception {
        PropertyDetailResponse response = PropertyDetailResponse.builder()
                .id(50L)
                .title("Modern 3BHK Apartment")
                .district("Bengaluru Urban")
                .status(PropertyStatus.DRAFT)
                .build();

        when(propertyService.getOwnerProperty(50L, 1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/properties/50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(50))
                .andExpect(jsonPath("$.data.title").value("Modern 3BHK Apartment"));
    }

    @Test
    @DisplayName("GET /api/v1/properties/{id} returns 404 when property is not found or owned by another user")
    void testGetPropertyNotFound() throws Exception {
        when(propertyService.getOwnerProperty(999L, 1L))
                .thenThrow(new ResourceNotFoundException("Property not found with ID: 999"));

        mockMvc.perform(get("/api/v1/properties/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Property not found with ID: 999")));
    }

    @Test
    @DisplayName("PUT /api/v1/properties/{id} updates draft property successfully")
    void testUpdateDraftSuccess() throws Exception {
        UpdatePropertyRequest updateRequest = UpdatePropertyRequest.builder()
                .title("Updated Title")
                .district("Bengaluru Rural")
                .price(new BigDecimal("40000.00"))
                .build();

        PropertyDetailResponse response = PropertyDetailResponse.builder()
                .id(50L)
                .title("Updated Title")
                .district("Bengaluru Rural")
                .price(new BigDecimal("40000.00"))
                .status(PropertyStatus.DRAFT)
                .build();

        when(propertyService.updateDraft(eq(50L), eq(1L), any(UpdatePropertyRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/properties/50")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Updated Title"))
                .andExpect(jsonPath("$.data.district").value("Bengaluru Rural"));
    }

    @Test
    @DisplayName("PUT /api/v1/properties/{id} returns 400 when property is not in DRAFT status")
    void testUpdateDraftNonDraftThrowsException() throws Exception {
        UpdatePropertyRequest updateRequest = UpdatePropertyRequest.builder()
                .title("Updated Title")
                .build();

        when(propertyService.updateDraft(eq(50L), eq(1L), any(UpdatePropertyRequest.class)))
                .thenThrow(new IllegalStateException("Only DRAFT properties can be updated"));

        mockMvc.perform(put("/api/v1/properties/50")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Only DRAFT properties can be updated"));
    }

    @Test
    @DisplayName("DELETE /api/v1/properties/{id} deletes draft property successfully")
    void testDeletePropertySuccess() throws Exception {
        doNothing().when(propertyService).deleteProperty(50L, 1L);

        mockMvc.perform(delete("/api/v1/properties/50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Property deleted successfully"));

        verify(propertyService).deleteProperty(50L, 1L);
    }

    @Test
    @DisplayName("PUT /api/v1/properties/{id}/submit submits draft for review successfully")
    void testSubmitPropertySuccess() throws Exception {
        PropertyDetailResponse response = PropertyDetailResponse.builder()
                .id(50L)
                .title("Submitted Title")
                .status(PropertyStatus.SUBMITTED)
                .build();

        when(propertyService.submitProperty(50L, 1L)).thenReturn(response);

        mockMvc.perform(put("/api/v1/properties/50/submit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"));
    }

    @Test
    @DisplayName("PUT /api/v1/properties/{id}/submit returns 400 when submission validation fails (no images)")
    void testSubmitPropertyValidationFailure() throws Exception {
        when(propertyService.submitProperty(50L, 1L))
                .thenThrow(new IllegalStateException("Property must have at least one image before submission"));

        mockMvc.perform(put("/api/v1/properties/50/submit"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("must have at least one image")));
    }

    @Test
    @DisplayName("GET /api/v1/properties/my returns paginated list of owner's properties")
    void testListOwnerPropertiesSuccess() throws Exception {
        PropertyResponse item = PropertyResponse.builder()
                .id(50L)
                .title("Luxury Villa")
                .propertyType(PropertyType.VILLA)
                .listingType(ListingType.RENT)
                .price(new BigDecimal("75000.00"))
                .status(PropertyStatus.DRAFT)
                .city("Bengaluru")
                .district("Bengaluru Urban")
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<PropertyResponse> page = new PageImpl<>(List.of(item), pageable, 1);

        when(propertyService.listOwnerProperties(eq(1L), any(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/properties/my?status=DRAFT&page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(50))
                .andExpect(jsonPath("$.data.content[0].title").value("Luxury Villa"))
                .andExpect(jsonPath("$.data.content[0].district").value("Bengaluru Urban"));
    }
}
