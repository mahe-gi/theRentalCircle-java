package com.platform.auth.security;

import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String secret = "test_super_secret_key_which_must_be_at_least_256_bits_long_for_hmac_sha256!";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 900000L); // 15 mins
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("generateToken and validateToken successfully extracts claims")
    void testGenerateAndValidateToken() {
        User user = User.builder()
                .id(42L)
                .email("tenant@rentalcircle.com")
                .passwordHash("hashed")
                .isActive(true)
                .roles(Set.of(new Role(Role.ROLE_USER)))
                .build();

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtTokenProvider.generateToken(principal);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo(42L);
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo("tenant@rentalcircle.com");

        List<String> roles = jwtTokenProvider.getRolesFromToken(token);
        assertThat(roles).containsExactly(Role.ROLE_USER);
    }

    @Test
    @DisplayName("validateToken returns false for invalid token")
    void testValidateInvalidToken() {
        assertThat(jwtTokenProvider.validateToken("invalid.token.structure")).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }
}
