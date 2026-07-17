/**
 * DevOpsDeploymentModal
 *
 * Shown when a developer moves a CR to CODE_REVIEW status.
 * Collects 3 deployment details that are included in the DevOps team email:
 *   - deploymentNote   : general notes for deployment
 *   - serverPath       : server + path (Server-1.42 is hardcoded, dev enters path only)
 *   - itemsToDeploy    : list of artifacts / items to deploy
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, FileText, Package, Send, X, AlertCircle, ChevronRight } from 'lucide-react';

export interface DevOpsDeploymentFields {
  deploymentNote: string;
  serverPath: string;
  itemsToDeploy: string;
}

interface DevOpsDeploymentModalProps {
  open: boolean;
  crName: string;
  jtrackId: string;
  developerName: string;
  /** Called with the 3 collected fields when user confirms */
  onConfirm: (fields: DevOpsDeploymentFields) => void;
  /** Called when user cancels — status update is NOT submitted */
  onCancel: () => void;
}

const SERVER_PREFIX = 'Server-1.42: ';

export const DevOpsDeploymentModal: React.FC<DevOpsDeploymentModalProps> = ({
  open,
  crName,
  jtrackId,
  developerName,
  onConfirm,
  onCancel,
}) => {
  const [deploymentNote, setDeploymentNote] = useState('');
  const [pathSuffix, setPathSuffix] = useState('');
  const [itemsToDeploy, setItemsToDeploy] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!deploymentNote.trim() || !pathSuffix.trim() || !itemsToDeploy.trim()) {
      setError('All three fields are required before sending to Code Review.');
      return;
    }
    setError('');
    const serverPath = `${SERVER_PREFIX}${pathSuffix.trim()}`;
    onConfirm({ deploymentNote, serverPath, itemsToDeploy });
    // reset for next open
    setDeploymentNote('');
    setPathSuffix('');
    setItemsToDeploy('');
  };

  const handleCancel = () => {
    setError('');
    setDeploymentNote('');
    setPathSuffix('');
    setItemsToDeploy('');
    onCancel();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[70]"
            onClick={handleCancel}
          />

          {/* Modal wrapper — scrollable on small screens */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-0 z-[71] flex items-center justify-center p-3 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[520px] max-h-[90vh] flex flex-col bg-[#080d1a] border border-white/[0.09] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ───────────────────────────── */}
              <div className="relative shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.06] bg-gradient-to-br from-[#0e1629] via-[#080d1a] to-[#080d1a]">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 flex items-center justify-center text-lg">
                      🚀
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 leading-tight">UAT Deployment Details</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">DevOps notification email will be sent with this CR</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors mt-0.5"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── Scrollable body ───────────────────── */}
              <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-4">

                {/* CR Info banner */}
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                    {jtrackId?.charAt(0) ?? 'C'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-zinc-500">{jtrackId}</p>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{crName}</p>
                    <p className="text-[10px] text-zinc-500">Developer: <span className="text-zinc-300">{developerName}</span></p>
                  </div>
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold">DevOps Email</span>
                </div>

                {/* ── Deployment Note ── */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <FileText size={11} className="text-emerald-400" />
                    Deployment Note
                    <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={deploymentNote}
                    onChange={(e) => setDeploymentNote(e.target.value)}
                    placeholder="e.g. New column added in users table — run migration script before deployment"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/15 resize-none transition-all leading-relaxed"
                  />
                </div>

                {/* ── Path — Server-1.42 hardcoded ── */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <Server size={11} className="text-emerald-400" />
                    Path
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/15 transition-all">
                    {/* Hardcoded prefix chip */}
                    <div className="flex items-center gap-1.5 shrink-0 px-3 py-2.5 bg-emerald-500/10 border-r border-white/[0.08]">
                      <Server size={11} className="text-emerald-400" />
                      <span className="text-xs font-mono font-semibold text-emerald-300 whitespace-nowrap">Server-1.42:</span>
                    </div>
                    {/* User-editable path portion */}
                    <input
                      type="text"
                      value={pathSuffix}
                      onChange={(e) => setPathSuffix(e.target.value)}
                      placeholder="/opt/tpf/apps/devtrack/lib"
                      className="flex-1 bg-transparent px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 pl-0.5">Enter the full deployment path inside the server</p>
                </div>

                {/* ── Items to Deploy ── */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <Package size={11} className="text-emerald-400" />
                    Items to Deploy
                    <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={itemsToDeploy}
                    onChange={(e) => setItemsToDeploy(e.target.value)}
                    placeholder={"devtrack-api.jar\napplication.properties\ndb/migration/V22__new_column.sql"}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/15 resize-none transition-all font-mono leading-relaxed"
                  />
                  <p className="text-[10px] text-zinc-600 pl-0.5">List each artifact on a new line</p>
                </div>

                {/* ── Error ── */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
                  >
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </div>

              {/* ── Footer ───────────────────────────── */}
              <div className="shrink-0 px-5 py-4 border-t border-white/[0.06] bg-[#060b16] flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all active:scale-[0.98]"
                >
                  <Send size={13} />
                  Send to Code Review &amp; Notify DevOps
                  <ChevronRight size={13} className="opacity-70" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DevOpsDeploymentModal;
