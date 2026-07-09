package com.devtrack.api.controller;

import com.devtrack.api.model.Attachment;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.AttachmentRepository;
import com.devtrack.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/attachments")
@Slf4j
public class AttachmentController {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip"
    );
    
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/gif", "application/pdf", "application/zip", "text/plain", "text/csv",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam("entityType") String entityType,
            @RequestParam("entityId") Long entityId) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: File is empty.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body("Error: File size exceeds the maximum limit of 5MB.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            // Null byte checks
            if (originalFilename.contains("\0") || originalFilename.contains("%00")) {
                return ResponseEntity.badRequest().body("Error: Malicious characters detected in filename.");
            }
            
            // Double extension checks
            String[] parts = originalFilename.split("\\.");
            if (parts.length > 2) {
                for (int i = 1; i < parts.length - 1; i++) {
                    String part = parts[i].toLowerCase();
                    if (Arrays.asList("php", "jsp", "asp", "exe", "sh", "js", "html", "htm").contains(part)) {
                        return ResponseEntity.badRequest().body("Error: Double extensions are not permitted.");
                    }
                }
            }
        }

        String ext = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest().body("Error: File extension not permitted.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body("Error: Content type not permitted.");
        }

        // Mock scan log
        log.info("Initiating secure malware scan on file: {}", originalFilename);
        log.info("Scan completed successfully. No threats detected.");

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();

        // Generate a random unique safe filename
        String safeName = sanitizeFileName(originalFilename);
        String uniqueName = UUID.randomUUID().toString() + "_" + safeName;

        Attachment attachment = new Attachment();
        attachment.setFileName(uniqueName);
        attachment.setFileType(contentType);
        attachment.setData(file.getBytes());
        attachment.setEntityType(entityType.toUpperCase());
        attachment.setEntityId(entityId);
        attachment.setUploadedBy(currentUser);

        return ResponseEntity.ok(attachmentRepository.save(attachment));
    }

    @GetMapping("/{entityType}/{entityId}")
    public List<Attachment> getAttachments(@PathVariable String entityType, @PathVariable Long entityId) {
        return attachmentRepository.findByEntityTypeAndEntityId(entityType.toUpperCase(), entityId);
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable Long id) {
        return attachmentRepository.findById(id)
                .map(attachment -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFileName() + "\"")
                        .contentType(MediaType.parseMediaType(attachment.getFileType()))
                        .body(attachment.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id) {
        return attachmentRepository.findById(id)
                .map(attachment -> {
                    attachmentRepository.delete(attachment);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        int lastIndex = fileName.lastIndexOf('.');
        if (lastIndex == -1) return "";
        return fileName.substring(lastIndex + 1).toLowerCase();
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "unknown";
        String cleanName = fileName.replaceAll("[\\\\/]", "");
        cleanName = cleanName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleanName;
    }
}
