/**
 * Document API service for DevTrack 2.0
 *
 * Architecture contract:
 *  - Frontend NEVER holds raw bytes — only documentId + metadata
 *  - Uploads use FormData with the real File object
 *  - Downloads trigger a browser download via a temporary anchor element
 *  - All API errors (413, 415, etc.) are surfaced as typed errors
 */

export type DocType = 'BRD' | 'API_DOC' | 'DESIGN' | 'SUPPORT';

export interface DocumentDto {
  id: number;
  crId: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  docType: DocType;
  version: number;
  checksumSha256: string;
  uploadedById: number;
  uploadedByName: string;
  uploadedAt: string; // ISO datetime
  deleted: boolean;
}

export interface UploadProgress {
  documentId?: number;
  percentage: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  dto?: DocumentDto;
}

import { APP_CONFIG } from '@/config/appConfig';

const API_BASE = `${APP_CONFIG.apiUrl}/api`;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── UPLOAD ─────────────────────────────────────────────────────────────────

/**
 * Uploads a file for a CR, returning the document metadata DTO.
 * Accepts an onProgress callback receiving 0..100 percentage.
 * Never sends raw bytes as base64 — uses FormData (binary multipart).
 *
 * Throws typed errors:
 *   { status: 413, message: 'File too large (max 25 MB)' }
 *   { status: 415, message: 'File type not allowed: ...' }
 */
export function uploadDocument(
  crId: number,
  docType: DocType,
  file: File,
  onProgress?: (pct: number) => void
): Promise<DocumentDto> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);         // raw File — browser handles binary encoding
    formData.append('docType', docType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/crs/${crId}/documents`);

    const headers = getAuthHeaders();
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    // Do NOT set Content-Type — browser sets multipart boundary automatically

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText) as DocumentDto);
        } catch {
          reject({ status: xhr.status, message: 'Invalid server response' });
        }
      } else if (xhr.status === 413) {
        reject({ status: 413, message: 'File too large. Maximum allowed size is 25 MB.' });
      } else if (xhr.status === 415) {
        let msg = 'File type not allowed.';
        try { msg = JSON.parse(xhr.responseText)?.message ?? msg; } catch { /* ignore */ }
        reject({ status: 415, message: msg });
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText)?.message ?? msg; } catch { /* ignore */ }
        reject({ status: xhr.status, message: msg });
      }
    });

    xhr.addEventListener('error', () => {
      reject({ status: 0, message: 'Network error during upload.' });
    });

    xhr.send(formData);
  });
}

// ── LIST ───────────────────────────────────────────────────────────────────

export async function listDocuments(crId: number): Promise<DocumentDto[]> {
  const res = await fetch(`${API_BASE}/crs/${crId}/documents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list documents: HTTP ${res.status}`);
  return res.json() as Promise<DocumentDto[]>;
}

// ── SINGLE METADATA ────────────────────────────────────────────────────────

export async function getDocumentMetadata(documentId: number): Promise<DocumentDto> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Document not found: HTTP ${res.status}`);
  return res.json() as Promise<DocumentDto>;
}

// ── DOWNLOAD ───────────────────────────────────────────────────────────────

/**
 * Triggers a browser download for a document.
 * Fetches bytes from the server and creates a temporary <a> element.
 * No bytes stored in state — blob URL is immediately revoked after click.
 */
export async function downloadDocument(documentId: number, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}/download`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up immediately — don't hold blob in memory
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 100);
}

// ── DELETE ─────────────────────────────────────────────────────────────────

export async function deleteDocument(documentId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: HTTP ${res.status}`);
  }
}

// ── UTILITIES ──────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  BRD: 'BRD',
  API_DOC: 'API Doc',
  DESIGN: 'Design Doc',
  SUPPORT: 'Supporting File',
};

export const DOC_TYPE_COLORS: Record<DocType, string> = {
  BRD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  API_DOC: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  DESIGN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SUPPORT: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.md', '.txt', '.log', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.zip', '.rar', '.7z', '.ppt', '.pptx'];
export const ALLOWED_MIME_TYPES: string[] = []; // empty = accept all mime types
