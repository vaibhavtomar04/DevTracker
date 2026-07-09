package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Stores the raw binary content for a Document.
 * Shares the PK with Document and is loaded LAZILY to keep the hot path fast.
 * Never expose this entity directly via REST — stream through DocumentService.
 */
@Entity
@Table(name = "document_content")
@Data
@NoArgsConstructor
public class DocumentContent {

    /**
     * Same PK as Document — one-to-one relationship implemented via shared PK.
     * On Document delete → DocumentContent cascades (ON DELETE CASCADE in DB).
     */
    @Id
    @Column(name = "document_id")
    private Long documentId;

    /**
     * The raw file bytes stored in a LONGBLOB column.
     * fetch = LAZY ensures the blob is NEVER loaded unless explicitly requested.
     * This is the only field that holds binary data — never base64, never String.
     */
    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "data", nullable = false, columnDefinition = "LONGBLOB")
    private byte[] data;

    /** Convenience constructor used in DocumentService. */
    public DocumentContent(Long documentId, byte[] data) {
        this.documentId = documentId;
        this.data = data;
    }
}
