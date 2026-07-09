package com.devtrack.api.controller;

import com.devtrack.api.dto.DocumentDto;
import com.devtrack.api.model.Document;
import com.devtrack.api.services.DocumentService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * REST controller for CR document management.
 *
 * Endpoints:
 *   POST   /api/crs/{crId}/documents            — upload a document
 *   GET    /api/crs/{crId}/documents            — list all metadata for a CR
 *   GET    /api/documents/{id}                  — single document metadata
 *   GET    /api/documents/{id}/download         — stream bytes to client
 *   DELETE /api/documents/{id}                  — soft delete
 *
 * The controller NEVER touches bytes directly — it delegates to DocumentService
 * which streams bytes straight to HttpServletResponse.
 */
@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    // ── UPLOAD ───────────────────────────────────────────────────────
    /**
     * Uploads a document for a CR.
     * Accepts: multipart/form-data with fields:
     *   file     — the raw file
     *   docType  — BRD | API_DOC | DESIGN | SUPPORT
     *
     * Returns DocumentDto (metadata only — no bytes).
     * Errors: 400 validation, 404 CR not found, 413 too large, 415 bad MIME.
     */
    @PostMapping("/api/crs/{crId}/documents")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN', 'CODEREVIEWER', 'TESTER', 'TESTADMIN')")
    public ResponseEntity<DocumentDto> uploadDocument(
            @PathVariable Long crId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") Document.DocType docType) {

        DocumentDto dto = documentService.upload(crId, docType, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    // ── LIST ─────────────────────────────────────────────────────────
    /** Returns metadata list for all non-deleted documents attached to a CR. */
    @GetMapping("/api/crs/{crId}/documents")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DocumentDto>> listDocuments(@PathVariable Long crId) {
        return ResponseEntity.ok(documentService.listForCr(crId));
    }

    // ── SINGLE METADATA ──────────────────────────────────────────────
    @GetMapping("/api/documents/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentDto> getDocument(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getMetadata(id));
    }

    // ── DOWNLOAD (STREAM) ────────────────────────────────────────────
    /**
     * Streams raw bytes with correct Content-Type and Content-Disposition headers.
     * Bytes are never buffered in controller memory — DocumentService writes
     * directly to HttpServletResponse's OutputStream.
     */
    @GetMapping("/api/documents/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public void downloadDocument(
            @PathVariable Long id,
            HttpServletResponse response) throws IOException {
        documentService.streamDownload(id, response);
    }

    // ── SOFT DELETE ──────────────────────────────────────────────────
    @DeleteMapping("/api/documents/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN', 'CODEREVIEWER', 'TESTER', 'TESTADMIN')")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        documentService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
