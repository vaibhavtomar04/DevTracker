/**
 * DocumentUpload — premium drag-and-drop file upload component
 *
 * Features:
 *  - Drag-and-drop zone with animated border highlight
 *  - Per-file upload progress bar
 *  - DocType badge selector (BRD, API_DOC, DESIGN, SUPPORT)
 *  - File type + size validation with inline error messages
 *  - 413 / 415 error surfacing from backend
 *  - Retry button for failed uploads
 *  - Never stores raw bytes — only calls DocumentService
 */

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import {
  type DocType,
  type DocumentDto,
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
  ALLOWED_EXTENSIONS,
  formatFileSize,
} from '../../services/document.service';
import { useDocumentUpload, type FileUploadState } from '../../hooks/useDocumentUpload';

interface DocumentUploadProps {
  crId: number;
  onUploaded?: (doc: DocumentDto) => void;
  defaultDocType?: DocType;
  compact?: boolean;
}

const DOC_TYPES: DocType[] = ['BRD', 'API_DOC', 'DESIGN', 'SUPPORT'];

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  doc: '📝',
  xlsx: '📊',
  md: '📋',
  txt: '📋',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
};

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? '📁';
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  crId,
  onUploaded,
  defaultDocType = 'SUPPORT',
  compact = false,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<DocType>(defaultDocType);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploads, addFiles, removeFile, retryFile, clearCompleted } = useDocumentUpload(crId);

  // Track previous success state to fire onUploaded callback
  const notifiedRef = useRef<Set<string>>(new Set());
  uploads.forEach((u) => {
    if (u.progress.status === 'success' && u.progress.dto && !notifiedRef.current.has(u.fileKey)) {
      notifiedRef.current.add(u.fileKey);
      onUploaded?.(u.progress.dto);
    }
  });

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      addFiles(Array.from(files), selectedDocType);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles, selectedDocType]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => setIsDragOver(false);

  const hasCompleted = uploads.some((u) => u.progress.status === 'success');

  return (
    <div className="space-y-3">
      {/* DocType Selector */}
      <div className="flex flex-wrap gap-2">
        {DOC_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedDocType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              selectedDocType === type
                ? DOC_TYPE_COLORS[type] + ' scale-105 shadow-sm'
                : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
            }`}
          >
            {DOC_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Drop Zone */}
      <motion.div
        animate={{
          borderColor: isDragOver ? 'var(--brand-primary)' : 'rgba(255,255,255,0.1)',
          backgroundColor: isDragOver ? 'rgba(var(--primary-rgb),0.07)' : 'rgba(255,255,255,0.02)',
        }}
        transition={{ duration: 0.2 }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          compact ? 'py-6' : 'py-10'
        } flex flex-col items-center justify-center gap-2 group`}
      >
        <motion.div
          animate={{ scale: isDragOver ? 1.1 : 1, y: isDragOver ? -2 : 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="text-3xl"
        >
          {isDragOver ? '⬇️' : '📎'}
        </motion.div>
        <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
          {isDragOver ? 'Drop files here' : 'Drag files here or click to browse'}
        </p>
        <p className="text-xs text-zinc-500">
          Any file type · max 25 MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </motion.div>

      {/* Upload Progress List */}
      <AnimatePresence initial={false}>
        {uploads.map((upload) => (
          <UploadItem
            key={upload.fileKey}
            upload={upload}
            onRemove={() => removeFile(upload.fileKey)}
            onRetry={() => retryFile(upload.fileKey)}
          />
        ))}
      </AnimatePresence>

      {/* Clear Completed */}
      {hasCompleted && (
        <button
          onClick={clearCompleted}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear completed uploads
        </button>
      )}
    </div>
  );
};

// ── Upload Item ──────────────────────────────────────────────────────────

interface UploadItemProps {
  upload: FileUploadState;
  onRemove: () => void;
  onRetry: () => void;
}

const UploadItem: React.FC<UploadItemProps> = ({ upload, onRemove, onRetry }) => {
  const { file, progress, docType } = upload;
  const isError = progress.status === 'error';
  const isSuccess = progress.status === 'success';
  const isUploading = progress.status === 'uploading';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border p-3 ${
        isError
          ? 'border-rose-500/30 bg-rose-500/5'
          : isSuccess
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center gap-3">
        {file.type.startsWith("image/") ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40 mt-0.5">
            <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-lg shrink-0 mt-0.5">
            {getFileIcon(file.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{file.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${DOC_TYPE_COLORS[docType]}`}>
              {DOC_TYPE_LABELS[docType]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-500">{formatFileSize(file.size)}</span>
            {isSuccess && progress.dto && (
              <span className="text-xs text-zinc-500">· v{progress.dto.version}</span>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full"
                style={{ background: 'var(--linearPrimaryAccent)' }}
              />
            </div>
          )}

          {/* Error Message */}
          {isError && progress.error && (
            <p className="mt-1 text-xs text-rose-400">{progress.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isError && (
            <button
              onClick={onRetry}
              title="Retry"
              className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
            >
              ↺ Retry
            </button>
          )}
          {isSuccess && (
            <span className="text-emerald-400 text-sm">✓</span>
          )}
          {isUploading && (
            <span className="text-xs text-zinc-400">{progress.percentage}%</span>
          )}
          <button
            onClick={onRemove}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentUpload;
