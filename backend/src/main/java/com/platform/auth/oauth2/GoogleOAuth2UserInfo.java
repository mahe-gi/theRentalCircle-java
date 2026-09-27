package com.platform.auth.oauth2;

import java.util.Map;

public class GoogleOAuth2UserInfo {
    public static OAuth2UserInfo from(Map<String, Object> attributes) {
        String sub = (String) attributes.get("sub");
        String email = (String) attributes.get("email");
        String name = (String) attributes.getOrDefault("name", "");
        String givenName = (String) attributes.getOrDefault("given_name", name);
        String familyName = (String) attributes.getOrDefault("family_name", "");
        String picture = (String) attributes.getOrDefault("picture", "");
        return new OAuth2UserInfo(sub, email, name, givenName, familyName, picture);
    }
}
