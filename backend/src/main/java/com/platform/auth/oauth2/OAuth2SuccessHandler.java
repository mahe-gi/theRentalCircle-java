package com.platform.auth.oauth2;

import com.platform.auth.security.JwtTokenProvider;
import com.platform.auth.service.RefreshTokenService;
import com.platform.user.entity.User;
import com.platform.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;

    @Value("${app.oauth2.redirect-uri:http://localhost/auth/callback}")
    private String redirectUri;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Long userId = (Long) oAuth2User.getAttribute("userId");

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found after OAuth2"));

        // Generate JWT access token
        String accessToken = jwtTokenProvider.generateToken(user);

        // Generate refresh token and set as HttpOnly cookie
        var tokenResult = refreshTokenService.createRefreshToken(user);
        String rawRefreshToken = tokenResult.rawToken();

        Cookie refreshCookie = new Cookie("refresh_token", rawRefreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(false); // set true in production with HTTPS
        refreshCookie.setPath("/api/v1/auth/refresh");
        refreshCookie.setMaxAge(7 * 24 * 60 * 60);
        response.addCookie(refreshCookie);

        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
            .queryParam("token", accessToken)
            .build().toUriString();

        log.info("OAuth2 login success for user: {}", user.getEmail());
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
