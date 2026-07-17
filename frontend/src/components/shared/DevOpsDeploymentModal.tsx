/**
 * DevOpsDeploymentModal
 *
 * Shown when a developer moves a CR to CODE_REVIEW status.
 * Collects 3 deployment details that are included in the DevOps team email:
 *   - deploymentNote   : general notes for deployment
 *   - serverPath       : server + path (e.g. "Server-1.42: /opt/apps/deploy")
 *   - itemsToDeploy    : list of artifacts / items to deploy
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, FileText, Package, Send, X, AlertCircle } from 'lucide-react';

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

const InputField: React.FC<{
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
}> = ({ label, icon, placeholder, value, onChange, required, multiline, hint }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 uppercase tracking-wide">
      <span className="text-emerald-400">{icon}</span>
      {label}
      {required && <span className="text-rose-400">*</span>}
    </label>
    {multiline ? (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
      />
    )}
    {hint && <p className="text-[11px] text-zinc-500 pl-0.5">{hint}</p>}
  </div>
);

export const DevOpsDeploymentModal: React.FC<DevOpsDeploymentModalProps> = ({
  open,
  crName,
  jtrackId,
  developerName,
  onConfirm,
  onCancel,
}) => {
  const [deploymentNote, setDeploymentNote] = useState('');
  const [serverPath, setServerPath] = useState('');
  const [itemsToDeploy, setItemsToDeploy] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!deploymentNote.trim() || !serverPath.trim() || !itemsToDeploy.trim()) {
      setError('All three fields are required before sending to Code Review.');
      return;
    }
    setError('');
    onConfirm({ deploymentNote, serverPath, itemsToDeploy });
    // reset state for next open
    setDeploymentNote('');
    setServerPath('');
    setItemsToDeploy('');
  };

  const handleCancel = () => {
    setError('');
    setDeploymentNote('');
    setServerPath('');
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]"
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-[#0a0f1e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-emerald-900/30 via-[#0a0f1e] to-[#0a0f1e]">
                {/* Accent strip */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500/0" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🚀</span>
                      <h3 className="text-base font-bold text-zinc-100">UAT Deployment Details</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">DevOps Email</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Fill in the deployment details below. A deployment notification email will be sent to the DevOps team along with the Code Review request.
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* CR Info banner */}
              <div className="mx-6 mt-5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  {jtrackId?.charAt(0) ?? 'C'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono text-zinc-500">{jtrackId}</p>
                  <p className="text-sm font-medium text-zinc-200 truncate">{crName}</p>
                  <p className="text-xs text-zinc-500">Developer: <span className="text-zinc-300">{developerName}</span></p>
                </div>
              </div>

              {/* Form */}
              <div className="px-6 py-5 space-y-5">
                <InputField
                  label="Deployment Note"
                  icon={<FileText size={12} />}
                  placeholder="e.g. New column added in users table — run migration script before deployment"
                  value={deploymentNote}
                  onChange={setDeploymentNote}
                  required
                  multiline
                />

                <InputField
                  label="Path"
                  icon={<Server size={12} />}
                  placeholder="Server-1.42: /opt/tpf/apps/devtrack/lib"
                  value={serverPath}
                  onChange={setServerPath}
                  required
                  hint="Include server name and full deployment path"
                />

                <InputField
                  label="Items to Deploy"
                  icon={<Package size={12} />}
                  placeholder="devtrack-api.jar&#10;application.properties&#10;db/migration/V22__new_column.sql"
                  value={itemsToDeploy}
                  onChange={setItemsToDeploy}
                  required
                  multiline
                  hint="List each artifact on a new line"
                />

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98]"
                >
                  <Send size={14} />
                  Send to Code Review & Notify DevOps
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
