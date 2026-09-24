package com.platform.auth.service;

import com.platform.auth.dto.AuthResponse;
import com.platform.auth.dto.LoginRequest;
import com.platform.auth.dto.RegisterRequest;
import com.platform.auth.dto.UserResponse;
import com.platform.auth.security.JwtTokenProvider;
import com.platform.auth.security.UserPrincipal;
import com.platform.common.exception.AccountInactiveException;
import com.platform.common.exception.ResourceNotFoundException;
import com.platform.common.exception.TokenRefreshException;
import com.platform.common.exception.UserAlreadyExistsException;
import com.platform.user.entity.Role;
import com.platform.user.entity.User;
import com.platform.user.repository.RoleRepository;
import com.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    public record AuthSession(AuthResponse authResponse, String rawRefreshToken) {}

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new UserAlreadyExistsException("Email is already registered: " + normalizedEmail);
        }

        if (StringUtils.hasText(request.getMobile()) && userRepository.existsByMobile(request.getMobile().trim())) {
            throw new UserAlreadyExistsException("Mobile number is already registered: " + request.getMobile().trim());
        }

        Role userRole = roleRepository.findByName(Role.ROLE_USER)
                .orElseGet(() -> roleRepository.save(Role.builder().name(Role.ROLE_USER).build()));

        User user = User.builder()
                .email(normalizedEmail)
                .mobile(StringUtils.hasText(request.getMobile()) ? request.getMobile().trim() : null)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .userType(StringUtils.hasText(request.getUserType()) ? request.getUserType().trim().toUpperCase() : "TENANT")
                .isActive(true)
                .isEmailVerified(false)
                .isMobileVerified(false)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered new user with id: {} and email: {}", savedUser.getId(), savedUser.getEmail());

        return UserResponse.fromUser(savedUser);
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!user.isActive()) {
            throw new AccountInactiveException("Account is disabled. Please contact support.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        String accessToken = jwtTokenProvider.generateToken(userPrincipal);

        RefreshTokenService.RefreshTokenResult refreshResult = refreshTokenService.createRefreshToken(user);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .expiresIn(jwtTokenProvider.getExpirationMs() / 1000)
                .user(UserResponse.fromUser(user))
                .build();

        log.info("User {} logged in successfully", user.getEmail());
        return new AuthSession(authResponse, refreshResult.rawToken());
    }

    @Transactional(noRollbackFor = TokenRefreshException.class)
    public AuthSession refresh(String rawRefreshToken) {
        RefreshTokenService.RefreshTokenResult rotated = refreshTokenService.rotateRefreshToken(rawRefreshToken);
        User user = rotated.user();

        if (!user.isActive()) {
            throw new AccountInactiveException("Account is disabled. Please contact support.");
        }

        Set<String> roleNames = user.getRoles() != null
                ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet())
                : Set.of();

        String newAccessToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), roleNames);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(newAccessToken)
                .expiresIn(jwtTokenProvider.getExpirationMs() / 1000)
                .user(UserResponse.fromUser(user))
                .build();

        return new AuthSession(authResponse, rotated.rawToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (StringUtils.hasText(rawRefreshToken)) {
            refreshTokenService.revokeRefreshToken(rawRefreshToken);
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!user.isActive()) {
            throw new AccountInactiveException("Account is disabled. Please contact support.");
        }

        return UserResponse.fromUser(user);
    }
}
