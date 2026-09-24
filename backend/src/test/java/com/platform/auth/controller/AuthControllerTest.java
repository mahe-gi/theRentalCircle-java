package com.platform.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.auth.dto.*;
import com.platform.auth.security.UserPrincipal;
import com.platform.auth.service.AuthService;
import com.platform.common.exception.AccountInactiveException;
import com.platform.common.exception.GlobalExceptionHandler;
import com.platform.common.exception.TokenRefreshException;
import com.platform.common.exception.UserAlreadyExistsException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.Collections;
import java.util.Set;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private UserPrincipal testPrincipal;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "refreshExpirationMs", 604800000L);
        objectMapper = new ObjectMapper();

        testPrincipal = UserPrincipal.builder()
                .id(1L)
                .email("tenant@example.com")
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
                    return testPrincipal;
                }
                return null;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/auth/register creates user and returns 201 Created")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("newuser@example.com")
                .password("password123")
                .firstName("John")
                .lastName("Doe")
                .mobile("9876543210")
                .build();

        UserResponse userResponse = UserResponse.builder()
                .id(2L)
                .email("newuser@example.com")
                .firstName("John")
                .lastName("Doe")
                .mobile("9876543210")
                .roles(Set.of("ROLE_USER"))
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(userResponse);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("newuser@example.com"))
                .andExpect(jsonPath("$.data.firstName").value("John"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register validates short password and returns 400 Bad Request")
    void testRegisterValidationFailure() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("newuser@example.com")
                .password("short") // less than 8 chars
                .firstName("John")
                .lastName("Doe")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(authService, never()).register(any());
    }

    @Test
    @DisplayName("POST /api/v1/auth/register handles duplicate email with 409 Conflict")
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("existing@example.com")
                .password("password123")
                .firstName("John")
                .lastName("Doe")
                .build();

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new UserAlreadyExistsException("Email is already registered: existing@example.com"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("already registered")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login authenticates and sets HttpOnly Secure Lax cookie")
    void testLoginSuccess() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("tenant@example.com")
                .password("password123")
                .build();

        UserResponse userResponse = UserResponse.builder()
                .id(1L)
                .email("tenant@example.com")
                .firstName("John")
                .lastName("Doe")
                .roles(Set.of("ROLE_USER"))
                .isActive(true)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("jwt-access-token")
                .expiresIn(900L)
                .user(userResponse)
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthService.AuthSession(authResponse, "raw-refresh-token-123"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refresh_token=raw-refresh-token-123")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/v1/auth")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 401 on bad credentials")
    void testLoginBadCredentials() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("tenant@example.com")
                .password("wrongpassword")
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 403 on disabled/inactive account")
    void testLoginInactiveAccount() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("inactive@example.com")
                .password("password123")
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new AccountInactiveException("Account is disabled. Please contact support."));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Account is disabled")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh rotates token and sets new cookie")
    void testRefreshSuccess() throws Exception {
        UserResponse userResponse = UserResponse.builder()
                .id(1L)
                .email("tenant@example.com")
                .isActive(true)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("new-jwt-access-token")
                .expiresIn(900L)
                .user(userResponse)
                .build();

        when(authService.refresh("old-refresh-token"))
                .thenReturn(new AuthService.AuthSession(authResponse, "new-refresh-token-456"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("refresh_token", "old-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-jwt-access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refresh_token=new-refresh-token-456")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh fails on reused or invalid token with 401")
    void testRefreshReusedToken() throws Exception {
        when(authService.refresh("reused-token"))
                .thenThrow(new TokenRefreshException("Token reuse detected or token expired. All sessions revoked."));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("refreshToken", "reused-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Token reuse detected")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/logout revokes token and clears cookie with Max-Age 0")
    void testLogoutSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie("refreshToken", "active-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        verify(authService).logout("active-token");
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns current user profile when active")
    void testGetMeActiveUser() throws Exception {
        UserResponse userResponse = UserResponse.builder()
                .id(1L)
                .email("tenant@example.com")
                .firstName("John")
                .lastName("Doe")
                .isActive(true)
                .roles(Set.of("ROLE_USER"))
                .build();

        when(authService.getCurrentUser(1L)).thenReturn(userResponse);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("tenant@example.com"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 403 Forbidden when user is inactive (live check)")
    void testGetMeInactiveUser() throws Exception {
        when(authService.getCurrentUser(1L))
                .thenThrow(new AccountInactiveException("Account is inactive."));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("Account is inactive")));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 401 Unauthorized when unauthenticated")
    void testGetMeUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}
