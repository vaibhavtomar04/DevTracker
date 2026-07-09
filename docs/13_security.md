# Chapter 13: Security Documentation

This document describes the security protocols, encryption algorithms, network constraints, and vulnerability protections implemented in DevTrack 2.0.

---

## 13.1 Authentication & Secrets Management

### 1. Password Encryption (BCrypt)
- **Algorithm**: BCrypt password-hashing function (based on Blowfish cipher).
- **Configuration**: Standard Spring Security `BCryptPasswordEncoder` using a work factor of 10.
- **Data Store**: Salt is embedded within the generated hash string stored under `password` in the `users` table.

### 2. Time-Based One-Time Passwords (TOTP / MFA)
- **Specification**: Compliance with **RFC 6238** (TOTP: Time-Based One-Time Password Algorithm) and **RFC 4226** (HOTP).
- **Algorithm**: HMAC-SHA1 using a 32-character Base32 encoded shared secret.
- **Verification Window**: 30 seconds. Clock drift tolerance is set to $\pm 1$ step (allowing codes within a 90-second window to authenticate).
- **Recovery Codes**: 10 cryptographically secure, random 10-character alphanumeric codes generated using secure random number generators (`SecureRandom`) during registration. Once used, the code is invalidated in the database (`mfa_backup_codes` table).

---

## 13.2 Session & Network Security

### 1. JSON Web Tokens (JWT)
- **Signature Algorithm**: HMAC-SHA256 (HS256) signed using a secure 256-bit environment secret (`jwt.secret`).
- **Validation**: Performed by `JwtAuthenticationFilter` extending `OncePerRequestFilter`.
- **Claims**: Contains Subject (username), Issued-At (`iat`), Expiry (`exp`), and authorities.

### 2. CORS (Cross-Origin Resource Sharing)
- **Development**: Dev-server proxies requests to `/api` from port 5173 to port 8080.
- **Production**: Configured inside `WebConfig` and `SecurityConfig` to restrict origins to verified system domains. Allowed headers include `Authorization`, `Content-Type`, and `X-Requested-With`.

### 3. File Validation & Sanitization
- When developers upload unit testing documents:
  - Filename checked for directory traversal attempts (e.g. `../`).
  - Size verified against a backend limit of 10 MB.
  - MIME-type checked against approved lists (PDF, DOCX, PNG, JPG).
- Base64 payload is parsed and stored inside `document_content(content)` as a raw binary blob.
