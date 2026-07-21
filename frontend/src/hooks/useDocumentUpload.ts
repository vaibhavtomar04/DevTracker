/**
 * useDocumentUpload — strongly typed hook for document upload with progress tracking.
 *
 * Features:
 *  - Per-file upload progress tracking (0..100)
 *  - Queue multiple files simultaneously
 *  - 413/415 error messages surfaced inline per file
 *  - State holds only DocumentDto (metadata) — never raw bytes
 *  - Automatic retry support (manual via retryFile)
 */

import { useCallback, useState } from 'react';
import {
  type DocType,
  type DocumentDto,
  type UploadProgress,
  uploadDocument,
} from '../services/document.service';

export interface FileUploadState {
  /** Unique key for this upload entry — fileId not documentId */
  fileKey: string;
  file: File;
  docType: DocType;
  progress: UploadProgress;
}

interface UseDocumentUploadReturn {
  uploads: FileUploadState[];
  addFiles: (files: File[], docType: DocType) => void;
  removeFile: (fileKey: string) => void;
  retryFile: (fileKey: string) => void;
  clearCompleted: () => void;
  isUploading: boolean;
  uploadedDocs: DocumentDto[];
}

export function useDocumentUpload(crId: number): UseDocumentUploadReturn {
  const [uploads, setUploads] = useState<FileUploadState[]>([]);

  const updateProgress = useCallback((fileKey: string, progress: Partial<UploadProgress>) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.fileKey === fileKey ? { ...u, progress: { ...u.progress, ...progress } } : u
      )
    );
  }, []);

  const doUpload = useCallback(
    async (entry: FileUploadState) => {
      // 25 MB client-side check
      if (entry.file.size > 25 * 1024 * 1024) {
        updateProgress(entry.fileKey, {
          status: 'error',
          percentage: 0,
          error: 'File exceeds the 25 MB size limit.',
        });
        return;
      }

      updateProgress(entry.fileKey, { status: 'uploading', percentage: 0 });

      try {
        const dto = await uploadDocument(crId, entry.docType, entry.file, (pct) => {
          updateProgress(entry.fileKey, { percentage: pct });
        });
        updateProgress(entry.fileKey, { status: 'success', percentage: 100, dto, documentId: dto.id });
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        updateProgress(entry.fileKey, {
          status: 'error',
          percentage: 0,
          error: e.message ?? 'Upload failed. Please try again.',
        });
      }
    },
    [crId, updateProgress]
  );

  const addFiles = useCallback(
    (files: File[], docType: DocType) => {
      const newEntries: FileUploadState[] = files.map((file) => ({
        fileKey: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
        file,
        docType,
        progress: { percentage: 0, status: 'uploading' },
      }));

      setUploads((prev) => [...prev, ...newEntries]);

      // Start uploads immediately
      newEntries.forEach((entry) => doUpload(entry));
    },
    [doUpload]
  );

  const removeFile = useCallback((fileKey: string) => {
    setUploads((prev) => prev.filter((u) => u.fileKey !== fileKey));
  }, []);

  const retryFile = useCallback(
    (fileKey: string) => {
      const entry = uploads.find((u) => u.fileKey === fileKey);
      if (entry) doUpload(entry);
    },
    [uploads, doUpload]
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.progress.status !== 'success'));
  }, []);

  const isUploading = uploads.some((u) => u.progress.status === 'uploading');
  const uploadedDocs = uploads
    .filter((u) => u.progress.status === 'success' && u.progress.dto)
    .map((u) => u.progress.dto!);

  return { uploads, addFiles, removeFile, retryFile, clearCompleted, isUploading, uploadedDocs };
}
