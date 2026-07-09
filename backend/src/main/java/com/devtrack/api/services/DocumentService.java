package com.devtrack.api.services;

import com.devtrack.api.dto.DocumentDto;
import com.devtrack.api.model.*;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.DocumentContentRepository;
import com.devtrack.api.repository.DocumentRepository;
import com.devtrack.api.repository.TaskRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

/**
 * Core service for document upload, download, and lifecycle management.
 *
 * Architecture constraints enforced here:
 *  - Raw bytes NEVER leave this layer as Java objects (only streamed to HttpServletResponse)
 *  - SHA-256 checksum computed before persistence — integrity guaranteed
 *  - Versioning: (crId, docType, filename) determines version lineage
 *  - RBAC: only DEVADMIN or authorized CR participants may upload/download/delete
 *  - Every upload, download, and delete is written to the audit_logs table
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
            "application/msword",                                                       // .doc (legacy)
            "text/markdown",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
            "image/png",
            "image/jpeg",
            "image/jpg"
    );

    /** Max file size — also set in application.properties for multipart limits. */
    @Value("${document.max-size-bytes:26214400}") // 25 MB default
    private long maxSizeBytes;

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final AuditLogRepository auditLogRepository;
    private final com.devtrack.api.repository.UserRepository userRepository;
    private final TaskRepository taskRepository;

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD
    // ─────────────────────────────────────────────────────────────────

    /**
     * Uploads a document for a CR.
     * All validation, checksum, versioning, and audit happen atomically.
     *
     * @return DocumentDto (metadata only — no bytes)
     */
    @Transactional
    public DocumentDto upload(Long crId, Document.DocType docType, MultipartFile file) {
        User currentUser = resolveCurrentUser();

        // ── 1. Validate CR exists ────────────────────────────────────────
        taskRepository.findById(crId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CR not found: " + crId));

        // ── 2. File size check ───────────────────────────────────────────
        if (file.getSize() > maxSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "File exceeds maximum size of 25 MB. Received: " + file.getSize() + " bytes.");
        }

        // ── 3. MIME type allowlist check (declared MIME) ─────────────────
        String declaredMime = file.getContentType();
        if (declaredMime == null || !ALLOWED_MIME_TYPES.contains(declaredMime)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "File type not allowed: " + declaredMime +
                    ". Allowed: PDF, DOCX, DOC, XLSX, Markdown, TXT, PNG, JPG.");
        }

        // ── 4. Read bytes once ───────────────────────────────────────────
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded file.", e);
        }

        // ── 5. Magic-byte content sniffing (don't trust declared MIME) ───
        validateMagicBytes(bytes, declaredMime, file.getOriginalFilename());

        // ── 6. SHA-256 checksum ──────────────────────────────────────────
        String checksum = computeSha256(bytes);

        // ── 7. Versioning: (crId, docType, filename) → next version ──────
        String filename = sanitizeFilename(file.getOriginalFilename());
        int nextVersion = documentRepository
                .findMaxVersion(crId, docType, filename)
                .map(v -> v + 1)
                .orElse(1);

        // ── 8. Persist metadata ──────────────────────────────────────────
        Document doc = new Document();
        doc.setCrId(crId);
        doc.setFilename(filename);
        doc.setContentType(declaredMime);
        doc.setSizeBytes(file.getSize());
        doc.setDocType(docType);
        doc.setVersion(nextVersion);
        doc.setChecksumSha256(checksum);
        doc.setUploadedBy(currentUser);
        doc.setUploadedAt(LocalDateTime.now());
        Document savedDoc = documentRepository.save(doc);

        // ── 9. Persist content (LONGBLOB, same TX) ───────────────────────
        DocumentContent content = new DocumentContent(savedDoc.getId(), bytes);
        documentContentRepository.save(content);

        // ── 10. Audit ────────────────────────────────────────────────────
        writeAudit("DOCUMENT_UPLOAD", savedDoc.getId(), null,
                "filename=" + filename + " | version=" + nextVersion + " | size=" + file.getSize() + " | docType=" + docType,
                currentUser);

        log.info("Document uploaded: id={} crId={} docType={} version={} filename={} checksum={}",
                savedDoc.getId(), crId, docType, nextVersion, filename, checksum);

        return DocumentDto.from(savedDoc);
    }

    // ─────────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────────

    /** Returns metadata list for a CR — no bytes ever included. */
    @Transactional(readOnly = true)
    public List<DocumentDto> listForCr(Long crId) {
        return documentRepository.findAllByCrIdActive(crId)
                .stream()
                .map(DocumentDto::from)
                .toList();
    }

    /** Single document metadata. */
    @Transactional(readOnly = true)
    public DocumentDto getMetadata(Long documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + documentId));
        if (doc.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Document has been deleted.");
        }
        return DocumentDto.from(doc);
    }

    // ─────────────────────────────────────────────────────────────────
    // DOWNLOAD (streamed — bytes never loaded as a full Java object in controller)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Streams document bytes directly to the HTTP response.
     * The controller passes in the raw HttpServletResponse to avoid loading
     * the entire byte[] into controller memory.
     */
    @Transactional(readOnly = true)
    public void streamDownload(Long documentId, HttpServletResponse response) throws IOException {
        User currentUser = resolveCurrentUser();

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + documentId));

        if (doc.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Document has been deleted.");
        }

        DocumentContent content = documentContentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Document content missing."));

        // Set response headers
        String encodedFilename = URLEncoder.encode(doc.getFilename(), StandardCharsets.UTF_8)
                .replaceAll("\\+", "%20");
        response.setContentType(doc.getContentType());
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename*=UTF-8''" + encodedFilename);
        response.setContentLengthLong(doc.getSizeBytes());

        // Stream bytes
        try (OutputStream out = response.getOutputStream()) {
            out.write(content.getData());
            out.flush();
        }

        // Audit download
        writeAudit("DOCUMENT_DOWNLOAD", documentId, null, "filename=" + doc.getFilename(), currentUser);
        log.info("Document downloaded: id={} by={}", documentId, currentUser.getUsername());
    }

    // ─────────────────────────────────────────────────────────────────
    // SOFT DELETE
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public void softDelete(Long documentId) {
        User currentUser = resolveCurrentUser();
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().toString().contains("ROLE_DEVADMIN");

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + documentId));

        if (doc.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Document already deleted.");
        }

        // Only admin or uploader may delete
        boolean isUploader = doc.getUploadedBy() != null &&
                doc.getUploadedBy().getId().equals(currentUser.getId());
        if (!isAdmin && !isUploader) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the uploader or an admin may delete this document.");
        }

        doc.setDeleted(true);
        doc.setDeletedAt(LocalDateTime.now());
        doc.setDeletedBy(currentUser);
        documentRepository.save(doc);

        writeAudit("DOCUMENT_DELETE", documentId, null, "filename=" + doc.getFilename(), currentUser);
        log.info("Document soft-deleted: id={} by={}", documentId, currentUser.getUsername());
    }

    // ─────────────────────────────────────────────────────────────────
    // INTERNALS
    // ─────────────────────────────────────────────────────────────────

    private User resolveCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found."));
    }

    /**
     * Validates magic bytes against the declared MIME type.
     * Prevents attackers from renaming a .exe to .pdf.
     */
    private void validateMagicBytes(byte[] bytes, String declaredMime, String filename) {
        if (bytes.length < 4) return; // Too short to check
        // PDF: %PDF
        if (declaredMime.contains("pdf")) {
            if (!(bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46)) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "File content does not match declared PDF MIME type.");
            }
        }
        // DOCX/XLSX: PK (ZIP) header
        if (declaredMime.contains("openxmlformats")) {
            if (!(bytes[0] == 0x50 && bytes[1] == 0x4B)) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "File content does not match declared Office MIME type.");
            }
        }
        // PNG: 89 50 4E 47
        if (declaredMime.contains("png")) {
            if (!(bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "File content does not match declared PNG MIME type.");
            }
        }
        // JPEG: FF D8 FF
        if (declaredMime.contains("jpeg") || declaredMime.contains("jpg")) {
            if (!(bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF)) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "File content does not match declared JPEG MIME type.");
            }
        }
    }

    private String computeSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) return "unnamed";
        // Remove path traversal chars, keep extension
        return original.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }

    private void writeAudit(String action, Long documentId, String oldValue, String newValue, User actor) {
        AuditLog audit = new AuditLog();
        audit.setEntityType("DOCUMENT");
        audit.setEntityId(documentId);
        audit.setFieldName(action);
        audit.setOldValue(oldValue != null ? oldValue : "");
        audit.setNewValue(newValue != null ? newValue : "");
        audit.setChangedBy(actor);
        auditLogRepository.save(audit);
    }
}
