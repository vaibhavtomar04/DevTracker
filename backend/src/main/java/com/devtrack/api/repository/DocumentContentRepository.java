package com.devtrack.api.repository;

import com.devtrack.api.model.DocumentContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for document byte content.
 * Spring Data will load the @Lob field lazily when data() is accessed.
 * Keep all byte retrieval inside DocumentService — never expose raw bytes
 * directly from a controller return value.
 */
@Repository
public interface DocumentContentRepository extends JpaRepository<DocumentContent, Long> {
    // findById(documentId) — Spring Data default, used in DocumentService.download()
}
