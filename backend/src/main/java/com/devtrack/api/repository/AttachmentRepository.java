package com.devtrack.api.repository;

import com.devtrack.api.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
