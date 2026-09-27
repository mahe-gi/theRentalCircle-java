package com.platform.auth.oauth2;

import com.platform.user.entity.User;
import com.platform.user.entity.Role;
import com.platform.user.repository.UserRepository;
import com.platform.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();
        
        OAuth2UserInfo userInfo = GoogleOAuth2UserInfo.from(attributes);
        
        User user = userRepository.findByEmail(userInfo.email())
            .orElseGet(() -> createNewOAuth2User(userInfo));
        
        // Store user id in attributes for the success handler
        Map<String, Object> enrichedAttributes = new java.util.HashMap<>(attributes);
        enrichedAttributes.put("userId", user.getId());
        enrichedAttributes.put("dbUser", user);
        
        return new DefaultOAuth2User(
            Collections.emptyList(),
            enrichedAttributes,
            "sub"
        );
    }

    private User createNewOAuth2User(OAuth2UserInfo info) {
        Role userRole = roleRepository.findByName("ROLE_USER")
            .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));
        
        User user = new User();
        user.setEmail(info.email());
        user.setFirstName(info.firstName().isBlank() ? info.name() : info.firstName());
        user.setLastName(info.lastName().isBlank() ? "" : info.lastName());
        user.setPasswordHash("OAUTH2_" + UUID.randomUUID()); // Not usable for password login
        user.setUserType("TENANT");
        user.setActive(true);
        user.setEmailVerified(true); // Google emails are verified
        user.setRoles(new java.util.HashSet<>(Collections.singleton(userRole)));
        
        return userRepository.save(user);
    }
}
