package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "attachments")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Attachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name")
    private String fileName;
    
    @Column(name = "file_type")
    private String fileType;
    
    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] data;

    // TASK or BUG
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(name = "entity_id")
    private Long entityId;

    @ManyToOne
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @Column(name = "upload_date")
    private LocalDateTime uploadDate;

    @PrePersist
    protected void onCreate() {
        uploadDate = LocalDateTime.now();
    }

//    public Attachment() {}
//
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getFileName() { return fileName; }
//    public void setFileName(String fileName) { this.fileName = fileName; }
//
//    public String getFileType() { return fileType; }
//    public void setFileType(String fileType) { this.fileType = fileType; }
//
//    public byte[] getData() { return data; }
//    public void setData(byte[] data) { this.data = data; }
//
//    public String getEntityType() { return entityType; }
//    public void setEntityType(String entityType) { this.entityType = entityType; }
//
//    public Long getEntityId() { return entityId; }
//    public void setEntityId(Long entityId) { this.entityId = entityId; }
//
//    public User getUploadedBy() { return uploadedBy; }
//    public void setUploadedBy(User uploadedBy) { this.uploadedBy = uploadedBy; }
//
//    public LocalDateTime getUploadDate() { return uploadDate; }
}
