/**
 * DocumentList — displays document metadata for a CR with download support.
 *
 * Features:
 *  - Groups by docType (BRD, API_DOC, DESIGN, SUPPORT)
 *  - Shows version badge, uploader, date, size
 *  - Download button streams bytes from server (no bytes in state)
 *  - Skeleton loading state
 *  - Empty state illustration
 *  - Delete with confirmation (soft delete)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download } from 'lucide-react';
import { fmtDate } from '@/utils/dateFormat';
import {
  type DocumentDto,
  type DocType,
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
  formatFileSize,
  listDocuments,
  downloadDocument,
  deleteDocument,
} from '../../services/document.service';

interface DocumentListProps {
  crId: number;
  /** Called when a document is deleted so parent can refresh state */
  onDeleted?: (documentId: number) => void;
  /** Allows re-trigger of fetch when new docs are uploaded */
  refreshTrigger?: number;
  canDelete?: boolean;
}

const GROUP_ORDER: DocType[] = ['BRD', 'API_DOC', 'DESIGN', 'SUPPORT'];

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

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function getIcon(filename: string): string {
  return FILE_ICONS[getExt(filename)] ?? '📁';
}

function formatDate(iso: string): string {
  return fmtDate(iso);
}

export const DocumentList: React.FC<DocumentListProps> = ({
  crId,
  onDeleted,
  refreshTrigger = 0,
  canDelete = false,
}) => {
  const [docs, setDocs] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listDocuments(crId)
      .then((data) => {
        if (!cancelled) {
          setDocs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [crId, refreshTrigger]);

  const handleDownload = useCallback(async (doc: DocumentDto) => {
    if (downloadingId !== null) return;
    setDownloadingId(doc.id);
    try {
      await downloadDocument(doc.id, doc.filename);
    } catch {
      // Could surface a toast here
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId]);

  const handleDelete = useCallback(async (doc: DocumentDto) => {
    if (!confirm(`Delete "${doc.filename}" (version ${doc.version})?`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      onDeleted?.(doc.id);
    } catch {
      // Could surface a toast here
    } finally {
      setDeletingId(null);
    }
  }, [onDeleted]);

  if (loading) return <DocumentListSkeleton />;

  if (error) {
    return (
      <div className="text-center py-8 text-rose-400 text-sm">
        Failed to load documents: {error}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-3">📂</div>
        <p className="text-zinc-400 text-sm font-medium">No documents attached yet</p>
        <p className="text-zinc-600 text-xs mt-1">Upload BRD, API docs, or design files above</p>
      </div>
    );
  }

  // Group by docType
  const grouped: Record<DocType, DocumentDto[]> = {
    BRD: [],
    API_DOC: [],
    DESIGN: [],
    SUPPORT: [],
  };
  docs.forEach((doc) => {
    grouped[doc.docType].push(doc);
  });

  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((type) => {
        const groupDocs = grouped[type];
        if (groupDocs.length === 0) return null;

        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DOC_TYPE_COLORS[type]}`}>
                {DOC_TYPE_LABELS[type]}
              </span>
              <span className="text-xs text-zinc-600">{groupDocs.length} file{groupDocs.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {groupDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                  >
                    {doc.filename.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                        <img src={`/api/documents/${doc.id}/download`} alt={doc.filename} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-lg shrink-0">
                        {getIcon(doc.filename)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {doc.filename}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 font-mono shrink-0">
                          v{doc.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                        <span>{formatFileSize(doc.sizeBytes)}</span>
                        <span>·</span>
                        <span>{doc.uploadedByName}</span>
                        <span>·</span>
                        <span>{formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        title="Download"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-sky-400 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === doc.id ? '⏳' : <Download className="h-4 w-4" />}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? '⏳' : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────

function DocumentListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.02]">
          <div className="w-8 h-8 rounded bg-white/10 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-white/10 rounded w-3/5" />
            <div className="h-2.5 bg-white/5 rounded w-2/5" />
          </div>
          <div className="w-6 h-6 rounded bg-white/5 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default DocumentList;
