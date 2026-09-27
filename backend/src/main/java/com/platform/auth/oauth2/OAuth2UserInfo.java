package com.platform.auth.oauth2;

public record OAuth2UserInfo(
    String providerId,
    String email,
    String name,
    String firstName,
    String lastName,
    String pictureUrl
) {}
