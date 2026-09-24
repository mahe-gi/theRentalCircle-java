package com.platform.document.controller;

import com.platform.auth.security.UserPrincipal;
import com.platform.common.exception.GlobalExceptionHandler;
import com.platform.document.dto.DocumentResponse;
import com.platform.document.dto.DownloadResource;
import com.platform.document.entity.DocumentStatus;
import com.platform.document.entity.DocumentType;
import com.platform.document.service.DocumentStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    @Mock
    private DocumentStorageService documentStorageService;

    @InjectMocks
    private DocumentController documentController;

    private MockMvc mockMvc;
    private UserPrincipal ownerPrincipal;
    private UserPrincipal adminPrincipal;

    private static final byte[] VALID_PDF_BYTES = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35};

    @BeforeEach
    void setUp() {
        ownerPrincipal = UserPrincipal.builder()
                .id(1L)
                .email("owner@example.com")
                .password("encoded_pass")
                .isActive(true)
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_OWNER")))
                .build();

        adminPrincipal = UserPrincipal.builder()
                .id(99L)
                .email("admin@platform.com")
                .password("encoded_pass")
                .isActive(true)
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .build();

        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(org.springframework.security.core.annotation.AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                                          ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest,
                                          WebDataBinderFactory binderFactory) {
                String authHeader = webRequest.getHeader("Authorization");
                if (authHeader != null && authHeader.equals("Bearer admin-token")) {
                    return adminPrincipal;
                } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    return ownerPrincipal;
                }
                return null;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(documentController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/documents - Authenticated owner upload succeeds (201 Created)")
    void uploadDocument_AuthenticatedOwner_ReturnsCreated() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "tax_receipt.pdf", "application/pdf", VALID_PDF_BYTES
        );

        DocumentResponse responseDto = DocumentResponse.builder()
                .id(201L)
                .ownerProfileId(10L)
                .propertyId(50L)
                .documentType(DocumentType.PROPERTY_TAX_RECEIPT)
                .originalFilename("tax_receipt.pdf")
                .fileSizeBytes((long) VALID_PDF_BYTES.length)
                .contentType("application/pdf")
                .status(DocumentStatus.UPLOADED)
                .createdAt(Instant.now())
                .build();

        when(documentStorageService.uploadDocument(any(), eq(DocumentType.PROPERTY_TAX_RECEIPT), eq(50L), eq(1L)))
                .thenReturn(responseDto);

        mockMvc.perform(multipart("/api/v1/documents")
                        .file(file)
                        .param("documentType", "PROPERTY_TAX_RECEIPT")
                        .param("propertyId", "50")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(201)))
                .andExpect(jsonPath("$.data.documentType", is("PROPERTY_TAX_RECEIPT")))
                .andExpect(jsonPath("$.data.originalFilename", is("tax_receipt.pdf")))
                .andExpect(jsonPath("$.data.status", is("UPLOADED")));

        verify(documentStorageService).uploadDocument(any(), eq(DocumentType.PROPERTY_TAX_RECEIPT), eq(50L), eq(1L));
    }

    @Test
    @DisplayName("POST /api/v1/documents - Unauthenticated returns 401 Unauthorized")
    void uploadDocument_Unauthenticated_ReturnsUnauthorized() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "tax_receipt.pdf", "application/pdf", VALID_PDF_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents")
                        .file(file)
                        .param("documentType", "PROPERTY_TAX_RECEIPT"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("GET /api/v1/documents/{id}/download - Owner download streams file with correct security headers")
    void downloadDocument_Owner_ReturnsStreamingFileWithHeaders() throws Exception {
        Resource resource = new ByteArrayResource(VALID_PDF_BYTES);
        DownloadResource downloadResource = new DownloadResource(resource, "application/pdf", "safe_filename.pdf");

        when(documentStorageService.getDownloadResource(eq(301L), eq(1L), eq(false), any()))
                .thenReturn(downloadResource);

        mockMvc.perform(get("/api/v1/documents/301/download")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"safe_filename.pdf\""))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"))
                .andExpect(content().bytes(VALID_PDF_BYTES));
    }

    @Test
    @DisplayName("GET /api/v1/documents/{id}/download - Admin download streams file and marks isAdmin flag")
    void downloadDocument_Admin_ReturnsStreamingFile() throws Exception {
        Resource resource = new ByteArrayResource(VALID_PDF_BYTES);
        DownloadResource downloadResource = new DownloadResource(resource, "application/pdf", "admin_download.pdf");

        when(documentStorageService.getDownloadResource(eq(301L), eq(99L), eq(true), any()))
                .thenReturn(downloadResource);

        mockMvc.perform(get("/api/v1/documents/301/download")
                        .header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"admin_download.pdf\""))
                .andExpect(content().bytes(VALID_PDF_BYTES));

        verify(documentStorageService).getDownloadResource(eq(301L), eq(99L), eq(true), any());
    }

    @Test
    @DisplayName("GET /api/v1/documents/{id}/download - Access denied returns 403 Forbidden")
    void downloadDocument_Unauthorized_ReturnsForbidden() throws Exception {
        when(documentStorageService.getDownloadResource(eq(302L), eq(1L), eq(false), any()))
                .thenThrow(new AccessDeniedException("Access denied to document"));

        mockMvc.perform(get("/api/v1/documents/302/download")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Access denied: Access denied to document")));
    }

    @Test
    @DisplayName("GET /api/v1/documents/my - Owner lists own documents")
    void getMyDocuments_AuthenticatedOwner_ReturnsList() throws Exception {
        DocumentResponse doc1 = DocumentResponse.builder()
                .id(101L)
                .documentType(DocumentType.IDENTITY_PROOF)
                .originalFilename("id.pdf")
                .status(DocumentStatus.VERIFIED)
                .build();

        DocumentResponse doc2 = DocumentResponse.builder()
                .id(102L)
                .documentType(DocumentType.TITLE_DEED)
                .originalFilename("deed.pdf")
                .status(DocumentStatus.UPLOADED)
                .build();

        when(documentStorageService.getOwnerDocuments(1L)).thenReturn(List.of(doc1, doc2));

        mockMvc.perform(get("/api/v1/documents/my")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.length()", is(2)))
                .andExpect(jsonPath("$.data[0].id", is(101)))
                .andExpect(jsonPath("$.data[1].id", is(102)));
    }

    @Test
    @DisplayName("DELETE /api/v1/documents/{id} - Owner deletes unverified document successfully")
    void deleteDocument_AuthenticatedOwner_ReturnsOk() throws Exception {
        doNothing().when(documentStorageService).deleteDocument(201L, 1L);

        mockMvc.perform(delete("/api/v1/documents/201")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document deleted successfully")));

        verify(documentStorageService).deleteDocument(201L, 1L);
    }

    @Test
    @DisplayName("DELETE /api/v1/documents/{id} - Deleting verified document returns 400 Bad Request")
    void deleteDocument_Verified_ReturnsBadRequest() throws Exception {
        doThrow(new IllegalStateException("Verified documents cannot be deleted"))
                .when(documentStorageService).deleteDocument(202L, 1L);

        mockMvc.perform(delete("/api/v1/documents/202")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Verified documents cannot be deleted")));
    }
}
