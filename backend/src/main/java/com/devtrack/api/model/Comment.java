package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TASK or BUG
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "entity_id")
    private Long entityId;

    @Column(length = 2000)
    private String text;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }

//    public Comment() {}
//
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getEntityType() { return entityType; }
//    public void setEntityType(String entityType) { this.entityType = entityType; }
//
//    public Long getEntityId() { return entityId; }
//    public void setEntityId(Long entityId) { this.entityId = entityId; }
//
//    public String getText() { return text; }
//    public void setText(String text) { this.text = text; }
//
//    public User getUser() { return user; }
//    public void setUser(User user) { this.user = user; }
//
//    public LocalDateTime getCreatedDate() { return createdDate; }
}
