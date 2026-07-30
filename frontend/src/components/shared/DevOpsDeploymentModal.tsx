/**
 * DevOpsDeploymentModal
 *
 * Shown when a developer moves a CR to CODE_REVIEW status.
 * Collects 3 deployment details that are included in the DevOps team email:
 *   - deploymentNote   : general notes for deployment
 *   - serverPath       : server + path (Server-1.42 is hardcoded, dev enters path only)
 *   - itemsToDeploy    : list of artifacts / items to deploy
 *   - sendDevOpsMail   : whether to actually send the DevOps notification email (default true)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, FileText, Package, Send, X, AlertCircle, Bell, BellOff } from 'lucide-react';

export interface DevOpsDeploymentFields {
  deploymentNote: string;
  serverPath: string;
  itemsToDeploy: string;
  sendDevOpsMail: boolean;
}

interface DevOpsDeploymentModalProps {
  open: boolean;
  crName: string;
  jtrackId: string;
  developerName: string;
  onConfirm: (fields: DevOpsDeploymentFields) => void;
  onCancel: () => void;
}

const SERVER_PREFIX = 'Server-1.42: ';

/* ── Reusable field wrapper ─────────────────────────── */
const FieldLabel: React.FC<{ icon: React.ReactNode; label: string; required?: boolean }> = ({
  icon, label, required,
}) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-100 text-violet-600 shrink-0">
      {icon}
    </span>
    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </span>
    {required && <span className="text-rose-500 text-xs font-bold">*</span>}
  </div>
);

export const DevOpsDeploymentModal: React.FC<DevOpsDeploymentModalProps> = ({
  open, crName, jtrackId, developerName, onConfirm, onCancel,
}) => {
  const [deploymentNote, setDeploymentNote] = useState('');
  const [pathSuffix, setPathSuffix] = useState('');
  const [itemsToDeploy, setItemsToDeploy] = useState('');
  const [sendDevOpsMail, setSendDevOpsMail] = useState(true);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (sendDevOpsMail && (!deploymentNote.trim() || !pathSuffix.trim() || !itemsToDeploy.trim())) {
      setError('All three fields are required when sending to DevOps.');
      return;
    }
    setError('');
    onConfirm({
      deploymentNote,
      serverPath: pathSuffix.trim() ? `${SERVER_PREFIX}${pathSuffix.trim()}` : '',
      itemsToDeploy,
      sendDevOpsMail,
    });
    setDeploymentNote(''); setPathSuffix(''); setItemsToDeploy(''); setSendDevOpsMail(true);
  };

  const handleCancel = () => {
    setError('');
    setDeploymentNote(''); setPathSuffix(''); setItemsToDeploy(''); setSendDevOpsMail(true);
    onCancel();
  };

  const inputBase =
    'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[540px] max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="relative shrink-0 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-6 py-5">
                {/* shimmer line */}
                <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-xl shadow-inner">
                      🚀
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">UAT Deployment Details</h3>
                      <p className="text-[11px] text-violet-200 mt-0.5">
                        {sendDevOpsMail ? 'DevOps team will be notified via email' : 'DevOps notification is disabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-5 bg-slate-50/50">

                {/* CR Info card + DevOps toggle */}
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow">
                    {jtrackId?.charAt(0) ?? 'C'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono font-semibold text-violet-500 uppercase">{jtrackId}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{crName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Developer: <span className="text-slate-700 font-medium">{developerName}</span>
                    </p>
                  </div>

                  {/* ── DevOps Mail Toggle ── */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setSendDevOpsMail(v => !v); setError(''); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 ${
                        sendDevOpsMail ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      aria-label="Toggle DevOps mail"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          sendDevOpsMail ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${sendDevOpsMail ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {sendDevOpsMail ? 'Notify DevOps' : 'Skip DevOps'}
                    </span>
                  </div>
                </div>

                {/* Deployment fields — only required when sendDevOpsMail is true */}
                {sendDevOpsMail ? (
                  <>
                    {/* Deployment Note */}
                    <div>
                      <FieldLabel icon={<FileText size={13} />} label="Deployment Note" required />
                      <textarea
                        rows={3}
                        value={deploymentNote}
                        onChange={(e) => setDeploymentNote(e.target.value)}
                        placeholder="e.g. New column added in users table — run migration script before deployment"
                        className={`${inputBase} resize-none leading-relaxed`}
                      />
                    </div>

                    {/* Path — Server-1.42 hardcoded */}
                    <div>
                      <FieldLabel icon={<Server size={13} />} label="Path" required />
                      <div className="flex items-stretch rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all shadow-sm">
                        <div className="flex items-center gap-1.5 px-3.5 py-3 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 shrink-0">
                          <Server size={14} className="text-violet-600 dark:text-violet-400" />
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">Server-1.42:</span>
                        </div>
                        <input
                          type="text"
                          value={pathSuffix}
                          onChange={(e) => setPathSuffix(e.target.value)}
                          placeholder="/opt/tpf/apps/devtrack/lib"
                          className="flex-1 bg-transparent px-3.5 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono font-medium outline-none min-w-0"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 pl-1">Enter the full deployment path inside the server</p>
                    </div>

                    {/* Items to Deploy */}
                    <div>
                      <FieldLabel icon={<Package size={13} />} label="Items to Deploy" required />
                      <textarea
                        rows={4}
                        value={itemsToDeploy}
                        onChange={(e) => setItemsToDeploy(e.target.value)}
                        placeholder={"devtrack-api.jar\napplication.properties\ndb/migration/V22__new_column.sql"}
                        className={`${inputBase} resize-none font-mono leading-relaxed`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5 pl-1">List each artifact on a new line</p>
                    </div>
                  </>
                ) : (
                  /* Skipping DevOps — info banner */
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <BellOff size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">DevOps notification disabled</p>
                      <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                        The CR will move to Code Review but the DevOps team will <strong>not</strong> receive a deployment email.
                        Toggle the switch above to enable DevOps notification.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all active:scale-[0.98] ${
                    sendDevOpsMail
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-200'
                      : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-slate-200'
                  }`}
                >
                  {sendDevOpsMail ? <Bell size={14} /> : <Send size={14} />}
                  {sendDevOpsMail ? 'Send to Code Review & Notify DevOps' : 'Send to Code Review (Skip DevOps)'}
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
