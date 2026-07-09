package com.devtrack.api.repository;

import com.devtrack.api.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    /** All non-deleted documents for a CR, ordered by docType then version desc. */
    @Query("SELECT d FROM Document d WHERE d.crId = :crId AND d.deleted = false ORDER BY d.docType, d.version DESC")
    List<Document> findAllByCrIdActive(@Param("crId") Long crId);

    /** All documents (including deleted) for a CR — admin/audit use only. */
    @Query("SELECT d FROM Document d WHERE d.crId = :crId ORDER BY d.docType, d.version DESC")
    List<Document> findAllByCrId(@Param("crId") Long crId);

    /**
     * Used for versioning: find the latest version of a file with the same
     * (crId, docType, filename) triple so we can increment it.
     */
    @Query("SELECT MAX(d.version) FROM Document d WHERE d.crId = :crId AND d.docType = :docType AND d.filename = :filename")
    Optional<Integer> findMaxVersion(
            @Param("crId") Long crId,
            @Param("docType") Document.DocType docType,
            @Param("filename") String filename);
}
