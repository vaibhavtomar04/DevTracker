package com.devtrack.api.controller;

import com.devtrack.api.dto.DocumentDto;
import com.devtrack.api.model.Document;
import com.devtrack.api.services.DocumentService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

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

    /** Public download endpoint for email clients — permitted via WebSecurityConfig /api/auth/** */
    @GetMapping("/api/auth/documents/{id}/download")
    public void downloadDocumentPublic(
            @PathVariable Long id,
            HttpServletResponse response) throws IOException {
        documentService.streamDownload(id, response);
    }

    private ResponseEntity<byte[]> render(Long id, String ifNoneMatch) {
        DocumentService.DocumentPayload p = documentService.loadForRender(id);
        String etag = "\"" + p.meta().getChecksumSha256() + "\"";
        if (etag.equals(ifNoneMatch)) return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        return ResponseEntity.ok()
            .eTag(etag)
            .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePrivate())
            .contentType(MediaType.parseMediaType(p.meta().getContentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + p.meta().getFilename() + "\"")
            .body(p.data());
    }

    @GetMapping({"/api/documents/{id}/preview", "/api/auth/documents/{id}/preview"})
    public ResponseEntity<byte[]> preview(@PathVariable Long id,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String inm) { return render(id, inm); }

    @GetMapping({"/api/documents/{id}/thumbnail", "/api/auth/documents/{id}/thumbnail"})
    public ResponseEntity<byte[]> thumbnail(@PathVariable Long id,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String inm) { return render(id, inm); }

    // ── SOFT DELETE ──────────────────────────────────────────────────
    @DeleteMapping("/api/documents/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN', 'CODEREVIEWER', 'TESTER', 'TESTADMIN')")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        documentService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
