package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "entity_id")
    private Long entityId;
    
    @Column(name = "field_name")
    private String fieldName;
    
    @Column(name = "old_value")
    private String oldValue;
    
    @Column(name = "new_value")
    private String newValue;
    @Column(length = 1000)
    private String remarks;

    @ManyToOne
    @JoinColumn(name = "changed_by_id")
    private User changedBy;

    @Column(name = "changed_date")
    private LocalDateTime changedDate;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "browser")
    private String browser;

    @PrePersist
    protected void onCreate() {
        changedDate = LocalDateTime.now();
    }

//    public AuditLog() {}
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
//    public String getFieldName() { return fieldName; }
//    public void setFieldName(String fieldName) { this.fieldName = fieldName; }
//
//    public String getOldValue() { return oldValue; }
//    public void setOldValue(String oldValue) { this.oldValue = oldValue; }
//
//    public String getNewValue() { return newValue; }
//    public void setNewValue(String newValue) { this.newValue = newValue; }
//
//    public String getRemarks() { return remarks; }
//    public void setRemarks(String remarks) { this.remarks = remarks; }
//
//    public User getChangedBy() { return changedBy; }
//    public void setChangedBy(User changedBy) { this.changedBy = changedBy; }
//
//    public LocalDateTime getChangedDate() { return changedDate; }
}
