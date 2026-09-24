package com.platform.property.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.exception.GlobalExceptionHandler;
import com.platform.property.dto.PropertyImageResponse;
import com.platform.property.service.PropertyImageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class PropertyImageControllerTest {

    @Mock
    private PropertyImageService propertyImageService;

    @InjectMocks
    private PropertyImageController propertyImageController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private UserPrincipal ownerPrincipal;

    private static final byte[] VALID_JPEG_BYTES = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x01};

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

        ownerPrincipal = UserPrincipal.builder()
                .id(1L)
                .email("owner@example.com")
                .password("encoded_pass")
                .isActive(true)
                .authorities(Collections.emptyList())
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
                String authHeader = webRequest.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    return ownerPrincipal;
                }
                return null;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(propertyImageController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/properties/{id}/images - authenticated owner upload succeeds")
    void uploadImage_AuthenticatedOwner_ReturnsCreated() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "hall.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        PropertyImageResponse responseDto = PropertyImageResponse.builder()
                .id(101L)
                .propertyId(50L)
                .storageKey("properties/abc-123.jpg")
                .originalFilename("hall.jpg")
                .fileSizeBytes((long) VALID_JPEG_BYTES.length)
                .contentType("image/jpeg")
                .displayOrder(0)
                .isPrimary(true)
                .url("/uploads/properties/abc-123.jpg")
                .createdAt(Instant.now())
                .build();

        when(propertyImageService.uploadImage(eq(50L), any(), eq(1L))).thenReturn(responseDto);

        mockMvc.perform(multipart("/api/v1/properties/50/images")
                        .file(file)
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(101)))
                .andExpect(jsonPath("$.data.storageKey", is("properties/abc-123.jpg")))
                .andExpect(jsonPath("$.data.url", is("/uploads/properties/abc-123.jpg")))
                .andExpect(jsonPath("$.data.isPrimary", is(true)));

        verify(propertyImageService, times(1)).uploadImage(eq(50L), any(), eq(1L));
    }

    @Test
    @DisplayName("POST /api/v1/properties/{id}/images - missing authentication returns 401")
    void uploadImage_Unauthenticated_ReturnsUnauthorized() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "hall.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        mockMvc.perform(multipart("/api/v1/properties/50/images")
                        .file(file))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("POST /api/v1/properties/{id}/images - non-owner gets 403 Forbidden")
    void uploadImage_NonOwner_ReturnsForbidden() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "hall.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        when(propertyImageService.uploadImage(eq(50L), any(), eq(1L)))
                .thenThrow(new AccessDeniedException("You do not have permission to manage this property"));

        mockMvc.perform(multipart("/api/v1/properties/50/images")
                        .file(file)
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("DELETE /api/v1/properties/{id}/images/{imageId} - authenticated owner deletes successfully")
    void deleteImage_AuthenticatedOwner_ReturnsOk() throws Exception {
        doNothing().when(propertyImageService).deleteImage(50L, 101L, 1L);

        mockMvc.perform(delete("/api/v1/properties/50/images/101")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Image deleted successfully")));

        verify(propertyImageService, times(1)).deleteImage(50L, 101L, 1L);
    }

    @Test
    @DisplayName("PUT /api/v1/properties/{id}/images/{imageId}/primary - sets cover image successfully")
    void setPrimaryImage_AuthenticatedOwner_ReturnsOk() throws Exception {
        PropertyImageResponse responseDto = PropertyImageResponse.builder()
                .id(102L)
                .propertyId(50L)
                .storageKey("properties/def-456.png")
                .isPrimary(true)
                .url("/uploads/properties/def-456.png")
                .build();

        when(propertyImageService.setPrimary(50L, 102L, 1L)).thenReturn(responseDto);

        mockMvc.perform(put("/api/v1/properties/50/images/102/primary")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(102)))
                .andExpect(jsonPath("$.data.isPrimary", is(true)));

        verify(propertyImageService, times(1)).setPrimary(50L, 102L, 1L);
    }

    @Test
    @DisplayName("GET /api/v1/properties/{id}/images - returns list of property images")
    void getImages_ReturnsImageList() throws Exception {
        PropertyImageResponse img1 = PropertyImageResponse.builder()
                .id(101L)
                .propertyId(50L)
                .storageKey("properties/img1.jpg")
                .url("/uploads/properties/img1.jpg")
                .displayOrder(0)
                .isPrimary(true)
                .build();

        when(propertyImageService.getImagesForProperty(50L)).thenReturn(List.of(img1));

        mockMvc.perform(get("/api/v1/properties/50/images"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].id", is(101)))
                .andExpect(jsonPath("$.data[0].url", is("/uploads/properties/img1.jpg")));
    }
}
