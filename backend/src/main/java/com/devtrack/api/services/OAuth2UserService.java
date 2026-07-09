package com.devtrack.api.services;

import com.devtrack.api.model.Role;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Handles Microsoft Entra ID / Azure AD OAuth2 authentication claims.
 * Maps incoming email/claims to an existing DevTrack user; if none exists,
 * auto-provisions a user account with default DEVELOPER role.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = (String) attributes.get("email");
        if (email == null) email = (String) attributes.get("preferred_username");
        String name = (String) attributes.getOrDefault("name", "Microsoft User");

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("Email not provided by Microsoft identity provider.");
        }

        log.info("Processing Microsoft OAuth2 login for email={}", email);

        String finalEmail = email;
        User user = userRepository.findByEmail(finalEmail).orElseGet(() -> {
            log.info("Auto-provisioning new DevTrack user for Microsoft OAuth2 user={}", finalEmail);
            String username = finalEmail.split("@")[0].replaceAll("[^a-zA-Z0-9]", ".");
            User newUser = new User(
                    username,
                    passwordEncoder.encode(UUID.randomUUID().toString()), // random unusable password
                    name,
                    finalEmail,
                    Set.of(Role.DEVELOPER)
            );
            return userRepository.save(newUser);
        });

        return oAuth2User;
    }
}
