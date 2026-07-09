package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Metadata-only entity for uploaded documents.
 * Heavy bytes live in DocumentContent (separate table, lazy-loaded).
 * Frontend only ever receives/stores the document ID — never raw bytes.
 */
@Entity
@Table(
    name = "documents",
    indexes = {
        @Index(name = "idx_doc_cr_id",       columnList = "cr_id"),
        @Index(name = "idx_doc_cr_doc_type",  columnList = "cr_id, doc_type")
    }
)
@Data
@NoArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The CR this document belongs to. */
    @Column(name = "cr_id", nullable = false)
    private Long crId;

    @Column(name = "filename", nullable = false, length = 512)
    private String filename;

    /** MIME type stored at upload time (validated server-side). */
    @Column(name = "content_type", nullable = false, length = 128)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 32)
    private DocType docType;

    /**
     * Version number — auto-incremented per (cr_id, doc_type, filename).
     * Never overwrite an existing row; always insert a new version.
     */
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    /** SHA-256 hex checksum of the raw bytes, computed before storage. */
    @Column(name = "checksum_sha256", nullable = false, length = 64)
    private String checksumSha256;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    /** Soft-delete flag — we never physically remove a document row. */
    @Column(name = "deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;

    public enum DocType {
        BRD,       // Business Requirement Document
        API_DOC,   // API Specification Document
        DESIGN,    // Design Document
        SUPPORT    // Supporting / miscellaneous file
    }
}
