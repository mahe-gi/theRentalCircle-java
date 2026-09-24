package com.platform.auth.service;

import com.platform.auth.entity.RefreshToken;
import com.platform.auth.repository.RefreshTokenRepository;
import com.platform.common.exception.TokenRefreshException;
import com.platform.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    private final SecureRandom secureRandom = new SecureRandom();

    public record RefreshTokenResult(String rawToken, User user, Instant expiresAt) {}

    @Transactional
    public RefreshTokenResult createRefreshToken(User user) {
        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);
        Instant expiresAt = Instant.now().plusMillis(refreshExpirationMs);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(expiresAt)
                .build();

        refreshTokenRepository.save(refreshToken);
        return new RefreshTokenResult(rawToken, user, expiresAt);
    }

    @Transactional(noRollbackFor = TokenRefreshException.class)
    public RefreshTokenResult rotateRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new TokenRefreshException("Refresh token is missing");
        }

        String currentHash = hashToken(rawToken);
        RefreshToken existingToken = refreshTokenRepository.findByTokenHash(currentHash)
                .orElseThrow(() -> new TokenRefreshException("Refresh token not found"));

        User user = existingToken.getUser();
        String newRawToken = generateRawToken();
        String newHash = hashToken(newRawToken);
        Instant now = Instant.now();

        int rowsUpdated = refreshTokenRepository.rotateToken(existingToken.getId(), now, newHash);
        if (rowsUpdated == 0) {
            log.warn("Refresh token reuse detected or token expired for user {}. Revoking all tokens.", user.getId());
            refreshTokenRepository.revokeAllForUser(user.getId(), now);
            throw new TokenRefreshException("Token reuse detected or token expired. All sessions revoked.");
        }

        Instant newExpiresAt = now.plusMillis(refreshExpirationMs);
        RefreshToken newRefreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(newHash)
                .expiresAt(newExpiresAt)
                .build();

        refreshTokenRepository.save(newRefreshToken);
        return new RefreshTokenResult(newRawToken, user, newExpiresAt);
    }

    @Transactional
    public void revokeRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        String tokenHash = hashToken(rawToken);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevokedAt(Instant.now());
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void revokeAllUserTokens(Long userId) {
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private String generateRawToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
