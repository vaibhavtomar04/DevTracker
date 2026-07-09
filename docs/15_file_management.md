# Chapter 15: File Management

This document describes how documents, screenshots, and test artifacts are uploaded, stored, validated, and downloaded within DevTrack 2.0.

---

## 15.1 Upload Constraints & Protocols

### Supported File Types
- **Unit Testing Documents**: `.pdf`, `.docx`, `.txt`, `.xlsx`.
- **Proof of Testing Screenshots**: `.png`, `.jpg`, `.jpeg`.
- **Bug Attachments**: `.zip`, `.log`, `.txt`, `.png`, `.jpg`.

### Size Limitations
- Maximum single file upload size is set to **10 MB** (enforced by Spring Boot Web MVC multiparts configurations `spring.servlet.multipart.max-file-size` and verified on client-side prior to Base64 serialization).

---

## 15.2 Storage Architecture & Database Schema

Unlike traditional setups that store files on disk, DevTrack 2.0 uses a database-backed storage strategy to avoid file sync synchronization issues across load-balanced application instances.

### 1. `document` Entity
- **Properties**:
  - `id` (Long, PK)
  - `fileName` (String) - Original user filename.
  - `fileType` (String) - MIME-type descriptor (e.g. `image/png`).
  - `uploadedDate` (LocalDateTime)
  - `uploadedBy` (User)

### 2. `document_content` Entity
- **Properties**:
  - `documentId` (Long, PK, Foreign Key -> `document(id)` on delete cascade)
  - `content` (MediumBlob / LongText) - Holds base64 encoded byte content.

---

## 15.3 Download Mechanism
1. Client clicks the download link.
2. React store calls `apiClient` or fetches the Base64 data from the record.
3. React store converts the Base64 stream back into a binary array (Blob) inside browser memory.
4. Generates a temporary object URL (`URL.createObjectURL(blob)`), binds it to a dynamic `<a>` tag with a `download` attribute, programmatically clicks the link, and immediately revokes the URL to prevent memory leaks.
5. This prevents server filesystem exposure and ensures security auditing checks run prior to data access.
