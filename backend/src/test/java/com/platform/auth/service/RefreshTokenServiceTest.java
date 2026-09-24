package com.platform.auth.service;

import com.platform.auth.entity.RefreshToken;
import com.platform.auth.repository.RefreshTokenRepository;
import com.platform.common.exception.TokenRefreshException;
import com.platform.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshExpirationMs", 604800000L);

        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .firstName("Test")
                .lastName("User")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("createRefreshToken generates raw token, hashes with SHA-256 and persists")
    void testCreateRefreshToken() {
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshTokenService.RefreshTokenResult result = refreshTokenService.createRefreshToken(testUser);

        assertThat(result).isNotNull();
        assertThat(result.rawToken()).isNotBlank();
        assertThat(result.user()).isEqualTo(testUser);
        assertThat(result.expiresAt()).isAfter(Instant.now());

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());

        RefreshToken saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(testUser);
        assertThat(saved.getTokenHash()).isEqualTo(refreshTokenService.hashToken(result.rawToken()));
        assertThat(saved.getTokenHash()).hasSize(64); // SHA-256 hex is 64 chars
    }

    @Test
    @DisplayName("rotateRefreshToken succeeds when token is active and valid")
    void testRotateRefreshTokenSuccess() {
        String rawToken = "sample-raw-refresh-token";
        String tokenHash = refreshTokenService.hashToken(rawToken);

        RefreshToken existingToken = RefreshToken.builder()
                .id(10L)
                .user(testUser)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(existingToken));
        when(refreshTokenRepository.rotateToken(eq(10L), any(Instant.class), any(String.class))).thenReturn(1);
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshTokenService.RefreshTokenResult result = refreshTokenService.rotateRefreshToken(rawToken);

        assertThat(result).isNotNull();
        assertThat(result.rawToken()).isNotBlank();
        assertThat(result.rawToken()).isNotEqualTo(rawToken);
        assertThat(result.user()).isEqualTo(testUser);

        verify(refreshTokenRepository).rotateToken(eq(10L), any(Instant.class), any(String.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("rotateRefreshToken detects token reuse, revokes all user sessions, and throws TokenRefreshException")
    void testRotateRefreshTokenDetectsReuse() {
        String rawToken = "reused-raw-refresh-token";
        String tokenHash = refreshTokenService.hashToken(rawToken);

        RefreshToken reusedToken = RefreshToken.builder()
                .id(10L)
                .user(testUser)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plusSeconds(3600))
                .revokedAt(Instant.now().minusSeconds(60)) // already revoked
                .build();

        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(reusedToken));
        // Atomic update returns 0 because token was already revoked
        when(refreshTokenRepository.rotateToken(eq(10L), any(Instant.class), any(String.class))).thenReturn(0);

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken(rawToken))
                .isInstanceOf(TokenRefreshException.class)
                .hasMessageContaining("Token reuse detected");

        // Verifies strict invariant: all tokens revoked for the user account
        verify(refreshTokenRepository).revokeAllForUser(eq(testUser.getId()), any(Instant.class));
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("rotateRefreshToken throws exception if token does not exist")
    void testRotateRefreshTokenNotFound() {
        String rawToken = "non-existent-token";
        String tokenHash = refreshTokenService.hashToken(rawToken);

        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken(rawToken))
                .isInstanceOf(TokenRefreshException.class)
                .hasMessageContaining("Refresh token not found");
    }

    @Test
    @DisplayName("revokeRefreshToken sets revokedAt timestamp")
    void testRevokeRefreshToken() {
        String rawToken = "token-to-revoke";
        String tokenHash = refreshTokenService.hashToken(rawToken);

        RefreshToken token = RefreshToken.builder()
                .id(5L)
                .user(testUser)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        refreshTokenService.revokeRefreshToken(rawToken);

        assertThat(token.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(token);
    }
}
