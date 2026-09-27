package com.platform.auth.controller;

import com.platform.auth.dto.*;
import com.platform.auth.security.UserPrincipal;
import com.platform.auth.service.AuthService;
import com.platform.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request,
                                                           HttpServletResponse response) {
        AuthService.AuthSession session = authService.login(request);

        ResponseCookie cookie = createRefreshCookie(session.rawRefreshToken(), refreshExpirationMs / 1000);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Login successful", session.authResponse()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @CookieValue(name = "refresh_token", required = false) String cookieTokenSnake,
            @CookieValue(name = "refreshToken", required = false) String cookieTokenCamel,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerToken,
            @RequestBody(required = false) RefreshTokenRequest bodyRequest,
            HttpServletResponse response) {

        String cookieToken = StringUtils.hasText(cookieTokenSnake) ? cookieTokenSnake : cookieTokenCamel;
        String rawToken = extractRefreshToken(cookieToken, headerToken, bodyRequest);
        AuthService.AuthSession session = authService.refresh(rawToken);

        ResponseCookie cookie = createRefreshCookie(session.rawRefreshToken(), refreshExpirationMs / 1000);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", session.authResponse()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = "refresh_token", required = false) String cookieTokenSnake,
            @CookieValue(name = "refreshToken", required = false) String cookieTokenCamel,
            @RequestHeader(name = "X-Refresh-Token", required = false) String headerToken,
            @RequestBody(required = false) RefreshTokenRequest bodyRequest,
            HttpServletResponse response) {

        String cookieToken = StringUtils.hasText(cookieTokenSnake) ? cookieTokenSnake : cookieTokenCamel;
        String rawToken = extractRefreshToken(cookieToken, headerToken, bodyRequest);
        authService.logout(rawToken);

        ResponseCookie cookie = clearRefreshCookie();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required"));
        }

        UserResponse userResponse = authService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(userResponse));
    }

    private String extractRefreshToken(String cookieToken, String headerToken, RefreshTokenRequest bodyRequest) {
        if (StringUtils.hasText(cookieToken)) {
            return cookieToken;
        }
        if (StringUtils.hasText(headerToken)) {
            return headerToken.startsWith("Bearer ") ? headerToken.substring(7) : headerToken;
        }
        if (bodyRequest != null && StringUtils.hasText(bodyRequest.getRefreshToken())) {
            return bodyRequest.getRefreshToken();
        }
        return null;
    }

    private ResponseCookie createRefreshCookie(String token, long maxAgeSeconds) {
        return ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }
}
