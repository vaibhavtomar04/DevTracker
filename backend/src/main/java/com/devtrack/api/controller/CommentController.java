package com.devtrack.api.controller;

import com.devtrack.api.model.Comment;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.CommentRepository;
import com.devtrack.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/{entityType}/{entityId}")
    public List<Comment> getComments(@PathVariable String entityType, @PathVariable Long entityId) {
        return commentRepository.findByEntityTypeAndEntityId(entityType.toUpperCase(), entityId);
    }

    @PostMapping
    public ResponseEntity<Comment> addComment(@RequestBody Comment comment) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        comment.setUser(currentUser);
        comment.setEntityType(comment.getEntityType().toUpperCase());
        
        return ResponseEntity.ok(commentRepository.save(comment));
    }
}
