package com.devtrack.api.dto;

import com.devtrack.api.model.Document;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Public DTO for document metadata.
 * NEVER exposes bytes — only metadata + document ID.
 * Frontend stores this and uses the ID to construct download URLs.
 */
@Data
@Builder
public class DocumentDto {

    private Long id;
    private Long crId;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private Document.DocType docType;
    private Integer version;
    private String checksumSha256;
    private Long uploadedById;
    private String uploadedByName;
    private LocalDateTime uploadedAt;
    private boolean deleted;

    /** Convenience factory — maps a Document entity to a DTO (no bytes). */
    public static DocumentDto from(Document doc) {
        return DocumentDto.builder()
                .id(doc.getId())
                .crId(doc.getCrId())
                .filename(doc.getFilename())
                .contentType(doc.getContentType())
                .sizeBytes(doc.getSizeBytes())
                .docType(doc.getDocType())
                .version(doc.getVersion())
                .checksumSha256(doc.getChecksumSha256())
                .uploadedById(doc.getUploadedBy() != null ? doc.getUploadedBy().getId() : null)
                .uploadedByName(doc.getUploadedBy() != null ? doc.getUploadedBy().getFullName() : null)
                .uploadedAt(doc.getUploadedAt())
                .deleted(doc.isDeleted())
                .build();
    }
}
