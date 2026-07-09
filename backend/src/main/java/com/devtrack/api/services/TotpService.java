package com.devtrack.api.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

@Service
@Slf4j
public class TotpService {

    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int SECRET_BYTE_LENGTH = 20; // 160 bits for standard TOTP
    private static final int TIME_STEP_SECONDS = 30;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;

    @Value("${devtrack.security.mfa.master-key:devtrack-mfa-enterprise-master-secret-key-32b!}")
    private String masterKey;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generate a new cryptographically secure Base32 TOTP secret.
     */
    public String generateSecretKey() {
        byte[] bytes = new byte[SECRET_BYTE_LENGTH];
        secureRandom.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    /**
     * Generate standard OTP Auth URI for QR code generators / authenticators.
     * Format: otpauth://totp/DevTrack:user@company.com?secret=XXXXXXXX&issuer=DevTrack&algorithm=SHA1&digits=6&period=30
     */
    public String getOtpAuthUri(String username, String secretKey) {
        try {
            String encodedIssuer = URLEncoder.encode("DevTrack", StandardCharsets.UTF_8.name()).replace("+", "%20");
            String encodedUser = URLEncoder.encode(username, StandardCharsets.UTF_8.name()).replace("+", "%20");
            return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                    encodedIssuer, encodedUser, secretKey, encodedIssuer);
        } catch (Exception e) {
            log.error("Error formatting OTP auth URI", e);
            return String.format("otpauth://totp/DevTrack:%s?secret=%s&issuer=DevTrack", username, secretKey);
        }
    }

    /**
     * Validate a 6-digit TOTP code against secret key with ±1 window clock drift (±30s).
     */
    public boolean verifyTotpCode(String secretKey, String codeStr) {
        if (secretKey == null || codeStr == null || !codeStr.matches("\\d{6}")) {
            return false;
        }

        int code;
        try {
            code = Integer.parseInt(codeStr);
        } catch (NumberFormatException e) {
            return false;
        }

        long currentStep = System.currentTimeMillis() / 1000 / TIME_STEP_SECONDS;

        // Check window -1, 0, +1
        for (int i = -1; i <= 1; i++) {
            long step = currentStep + i;
            if (calculateTotpForStep(secretKey, step) == code) {
                return true;
            }
        }
        return false;
    }

    private int calculateTotpForStep(String secretKey, long step) {
        try {
            byte[] keyBytes = decodeBase32(secretKey);
            byte[] data = new byte[8];
            for (int i = 7; i >= 0; i--) {
                data[i] = (byte) (step & 0xFF);
                step >>= 8;
            }

            SecretKeySpec signKey = new SecretKeySpec(keyBytes, "HmacSHA1");
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(signKey);
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0xF;
            int binary = ((hash[offset] & 0x7F) << 24) |
                         ((hash[offset + 1] & 0xFF) << 16) |
                         ((hash[offset + 2] & 0xFF) << 8) |
                         (hash[offset + 3] & 0xFF);

            return binary % 1_000_000;
        } catch (Exception e) {
            log.error("Error calculating TOTP code", e);
            return -1;
        }
    }

    /**
     * AES-256 GCM Encryption for MFA Secrets at Rest.
     */
    public String encryptSecret(String plaintextSecret) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);
            SecretKey key = getAesKey();

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, spec);

            byte[] cipherText = cipher.doFinal(plaintextSecret.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return java.util.Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Failed to encrypt MFA secret", e);
            throw new RuntimeException("MFA secret encryption failure");
        }
    }

    /**
     * AES-256 GCM Decryption for MFA Secrets.
     */
    public String decryptSecret(String encryptedSecret) {
        try {
            byte[] combined = java.util.Base64.getDecoder().decode(encryptedSecret);
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);

            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

            SecretKey key = getAesKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, spec);

            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to decrypt MFA secret", e);
            throw new RuntimeException("MFA secret decryption failure");
        }
    }

    private SecretKey getAesKey() {
        byte[] keyBytes = new byte[32]; // 256 bit
        byte[] sourceBytes = masterKey.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(sourceBytes, 0, keyBytes, 0, Math.min(sourceBytes.length, keyBytes.length));
        return new SecretKeySpec(keyBytes, "AES");
    }

    // --- Base32 Helper Implementation ---
    private String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                result.append(BASE32_CHARS.charAt(index));
                bitsLeft -= 5;
            }
        }

        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            result.append(BASE32_CHARS.charAt(index));
        }

        return result.toString();
    }

    private byte[] decodeBase32(String base32) {
        String clean = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        byte[] bytes = new byte[clean.length() * 5 / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int count = 0;

        for (int i = 0; i < clean.length(); i++) {
            char c = clean.charAt(i);
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0) continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bytes[count++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return bytes;
    }
}
