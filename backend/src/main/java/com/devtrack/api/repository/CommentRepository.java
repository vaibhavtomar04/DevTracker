package com.devtrack.api.repository;

import com.devtrack.api.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
