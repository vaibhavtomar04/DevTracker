package com.devtrack.api.services;

import com.devtrack.api.model.PasswordResetToken;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.PasswordResetTokenRepository;
import com.devtrack.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetTokenService {
    @Value("${devtrack.passwordResetExpirationMs:900000}") // 15 minutes default
    private Long resetTokenDurationMs;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private UserRepository userRepository;

    public Optional<PasswordResetToken> findByToken(String token) {
        return passwordResetTokenRepository.findByToken(token);
    }

    @Transactional
    public PasswordResetToken createResetToken(User user) {
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setExpiryDate(Instant.now().plusMillis(resetTokenDurationMs));
        resetToken.setToken(UUID.randomUUID().toString());

        // Delete any existing reset token for this user
        passwordResetTokenRepository.deleteByUser(user);

        return passwordResetTokenRepository.save(resetToken);
    }

    public PasswordResetToken verifyExpiration(PasswordResetToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            passwordResetTokenRepository.delete(token);
            throw new RuntimeException("Password reset token was expired. Please request a new link");
        }
        return token;
    }

    @Transactional
    public void deleteToken(PasswordResetToken token) {
        passwordResetTokenRepository.delete(token);
    }
}
