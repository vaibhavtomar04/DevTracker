/**
 * CRDetailSlideOver — Full CR detail panel with 7 tabs
 *
 * Tabs: Overview | Timeline | Documents | Activity | Comments | Bugs | Approval
 *
 * Opens as a slide-over from the right, consistent with the app's panel pattern.
 * Displays all CR metadata, visual workflow timeline, document list with upload,
 * audit activity, comments, bug history, and approval workflow.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Task, type User } from '../../services/mockData';
import { QualityRiskBadge } from './QualityRiskBadge';
import { DocumentList } from './DocumentList';
import { DocumentUpload } from './DocumentUpload';
import { useTaskStore } from '../../store/taskStore';
import BugDetailModal from './BugDetailModal';
import { APP_CONFIG } from '@/config/appConfig';



interface Comment {
  id: number;
  text: string;
  user: User;
  createdDate: string;
}

type Tab = 'overview' | 'timeline' | 'documents' | 'activity' | 'comments' | 'bugs' | 'approval';

interface CRDetailSlideOverProps {
  crId: number | null;
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
  currentUser?: User | null;
  initialTab?: Tab;
}

// Workflow stages for timeline visualization
const WORKFLOW_STAGES = [
  { key: 'OPEN', label: 'Created', icon: '📋' },
  { key: 'IN_PROGRESS', label: 'Dev Started', icon: '💻' },
  { key: 'SIT_DEPLOYED', label: 'SIT Deploy', icon: '🚀' },
  { key: 'SIT_TESTING', label: 'SIT Testing', icon: '🔍' },
  { key: 'SIT_COMPLETED', label: 'SIT Passed', icon: '✅' },
  { key: 'CODE_REVIEW', label: 'Code Review', icon: '👀' },
  { key: 'CODE_REVIEW_DONE', label: 'Review Done', icon: '✓' },
  { key: 'MOVE_TO_UAT', label: 'UAT Deploy', icon: '🚀' },
  { key: 'UAT_TESTING', label: 'UAT Testing', icon: '🔍' },
  { key: 'UAT_COMPLETED', label: 'UAT Passed', icon: '✅' },
  { key: 'PROD_DEPLOYED', label: 'Prod Deploy', icon: '🚀' },
  { key: 'PROD_COMPLETED', label: 'Prod Done', icon: '🎉' },
  { key: 'CLOSED', label: 'Closed', icon: '🔒' },
];

const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  HIGHEST: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  Low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-zinc-100 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/30',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30',
  CHANGES_REQUESTED: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30',
  SIT_DEPLOYED: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30',
  SIT_TESTING: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30',
  SIT_COMPLETED: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
  CODE_REVIEW: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
  CODE_REVIEW_DONE: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30',
  MOVE_TO_UAT: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30',
  UAT_TESTING: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30',
  UAT_COMPLETED: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30',
  TESTING_COMPLETED: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
  PROD_DEPLOYED: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30',
  PROD_COMPLETED: 'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-500/30',
  CLOSED: 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/30',
};

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📋' },
  { key: 'timeline', label: 'Timeline', icon: '📅' },
  { key: 'documents', label: 'Documents', icon: '📎' },
  { key: 'activity', label: 'Activity', icon: '📊' },
  { key: 'comments', label: 'Comments', icon: '💬' },
  { key: 'bugs', label: 'Bugs', icon: '🐛' },
  { key: 'approval', label: 'Approval', icon: '✅' },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const CRDetailSlideOver: React.FC<CRDetailSlideOverProps> = ({
  crId,
  task,
  open,
  onClose,
  onStatusChange,
  currentUser,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [groupedLogs, setGroupedLogs] = useState<any[]>([]);
  const [timelineMode, setTimelineMode] = useState<'tree' | 'chrono'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [docRefreshTrigger, setDocRefreshTrigger] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch grouped timeline logs when Activity tab is opened or filters change
  useEffect(() => {
    if (activeTab === 'activity' && crId) {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (actorFilter) params.append('actorId', actorFilter);
      if (actionFilter) params.append('actionType', actionFilter);

      fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/TASK/${crId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then((r) => r.json())
        .then(setGroupedLogs)
        .catch(() => setGroupedLogs([]));
    }
  }, [activeTab, crId, searchQuery, actorFilter, actionFilter]);

  // Fetch comments
  useEffect(() => {
    if (activeTab === 'comments' && crId) {
      fetch(`${APP_CONFIG.apiUrl}/api/comments/TASK/${crId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then((r) => r.json())
        .then(setComments)
        .catch(() => setComments([]));
    }
  }, [activeTab, crId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset tab when opening a new task
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || 'overview');
      setSelectedBugId(null);
    }
  }, [crId, open, initialTab]);

  const submitComment = useCallback(async () => {
    if (!newComment.trim() || !crId) return;
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ entityType: 'TASK', entityId: crId, text: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        const updated = await fetch(`${APP_CONFIG.apiUrl}/api/comments/TASK/${crId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setComments(await updated.json());
      }
    } catch { /* silent */ }
  }, [newComment, crId]);

  if (!task || !open) return null;

  const currentStageIndex = WORKFLOW_STAGES.findIndex((s) => s.key === task.status);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[720px] max-w-[95vw] bg-[#080c18] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.07] bg-[#0a0f1e]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                      {task.jtrackId}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority] ?? ''}`}>
                      {task.priority}
                    </span>
                    <QualityRiskBadge taskId={task.id} isQualityRisk={(task as any).isQualityRisk} />
                  </div>
                  <h2 className="text-base font-semibold text-zinc-100 leading-snug line-clamp-2">
                    {task.title}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Created by {task.createdBy?.fullName} · {formatDate(task.createdDate)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors text-lg"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-0.5 mt-4 -mb-px overflow-x-auto scrollbar-none">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="p-6"
                >
                  {activeTab === 'overview' && <OverviewTab task={task} currentUser={currentUser} />}
                  {activeTab === 'timeline' && (
                    <TimelineTab task={task} stages={WORKFLOW_STAGES} currentStageIndex={currentStageIndex} />
                  )}
                  {activeTab === 'documents' && crId && (
                    <DocumentsTab
                      crId={crId}
                      refreshTrigger={docRefreshTrigger}
                      showUpload={showUpload}
                      onToggleUpload={() => setShowUpload((v) => !v)}
                      onUploaded={() => setDocRefreshTrigger((v) => v + 1)}
                      canDelete={
                        (currentUser?.roles?.some((r) => r.includes('ADMIN')) ?? false) ||
                        (currentUser?.roles?.some((r) => r.includes('TESTER')) ?? false)
                      }
                    />
                  )}
                   {activeTab === 'activity' && crId && (
                     <ActivityTab
                       groupedLogs={groupedLogs}
                       crId={crId}
                       timelineMode={timelineMode}
                       setTimelineMode={setTimelineMode}
                       searchQuery={searchQuery}
                       setSearchQuery={setSearchQuery}
                       actorFilter={actorFilter}
                       setActorFilter={setActorFilter}
                       actionFilter={actionFilter}
                       setActionFilter={setActionFilter}
                     />
                   )}
                  {activeTab === 'comments' && (
                    <CommentsTab
                      comments={comments}
                      newComment={newComment}
                      onChangeComment={setNewComment}
                      onSubmit={submitComment}
                    />
                  )}
                  {activeTab === 'bugs' && (
                    <BugsTab taskId={task.id} onSelectBug={(id) => setSelectedBugId(id)} />
                  )}
                  {activeTab === 'approval' && (
                    <ApprovalTab task={task} currentUser={currentUser} onStatusChange={onStatusChange} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            {selectedBugId !== null && (
              <BugDetailModal
                bugId={selectedBugId}
                onClose={() => setSelectedBugId(null)}
                showDeveloperActions={currentUser?.roles?.includes("DEVELOPER") || currentUser?.roles?.includes("DEVADMIN")}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Tab Components ──────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-zinc-500">{label}</span>
    <span className="text-sm text-zinc-200">{value ?? '—'}</span>
  </div>
);

function OverviewTab({ task, currentUser }: { task: Task; currentUser?: User | null }) {
  const { auditLogs, updateTask, addToast } = useTaskStore();
  const isAdmin = (currentUser?.roles?.some(r => r.includes('ADMIN') || r.includes('DEVADMIN') || r.includes('TESTADMIN')) ?? false) || (currentUser as any)?.role?.includes('ADMIN');

  const [isEditingExpected, setIsEditingExpected] = useState(false);
  const [expSitDate, setExpSitDate] = useState(task.expectedSitDeploymentDate || '');
  const [expUatDate, setExpUatDate] = useState(task.expectedUatDeploymentDate || '');
  const [isSavingDates, setIsSavingDates] = useState(false);

  const handleSaveExpectedDates = async () => {
    if (!currentUser) return;
    setIsSavingDates(true);
    try {
      await updateTask(
        task.id,
        {
          expectedSitDeploymentDate: expSitDate || undefined,
          expectedUatDeploymentDate: expUatDate || undefined,
        },
        'Admin updated expected SIT & UAT deployment dates',
        currentUser
      );
      addToast('Expected deployment dates updated successfully!', 'success');
      setIsEditingExpected(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to update expected dates', 'error');
    } finally {
      setIsSavingDates(false);
    }
  };

  const rejectLog = auditLogs
    ?.filter((l: any) => l.entityType === 'TASK' && l.entityId === task.id && l.fieldName === 'workflow_reject')
    ?.sort((a: any, b: any) => new Date(b.changedDate || 0).getTime() - new Date(a.changedDate || 0).getTime())[0];

  const reviewerName = typeof rejectLog?.changedBy === 'object' && rejectLog?.changedBy?.fullName 
    ? rejectLog.changedBy.fullName 
    : (typeof rejectLog?.changedBy === 'string' ? rejectLog.changedBy : (task.codeReviewer?.fullName || 'Code Reviewer'));

  const displayRemarks = rejectLog?.remarks || task.remarks;

  return (
    <div className="space-y-6">
      {/* Code Review Rejection & Required Changes Alert Card */}
      {(task.status === 'CHANGES_REQUESTED' || task.status === 'IN_PROGRESS') && (rejectLog || task.remarks) && (
        <div className="rounded-2xl border-2 border-rose-500/60 bg-gradient-to-r from-rose-950/90 via-rose-900/75 to-rose-950/90 p-4.5 shadow-2xl space-y-3 text-left">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-rose-300 text-lg">⚠️</span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-200">
                Code Review Rejection & Required Changes
              </span>
            </div>
            <span className="text-xs font-bold text-rose-100 bg-rose-600/40 border border-rose-400/50 px-3 py-0.5 rounded-full">
              Reviewer: {reviewerName}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block mb-1">
              Reviewer Remarks / Feedback:
            </span>
            <p className="text-sm font-bold text-white bg-black/70 border border-rose-400/40 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap shadow-inner">
              {displayRemarks || "Changes requested during code review. Please review and resubmit."}
            </p>
          </div>
          <p className="text-xs text-rose-200 italic text-right">
            Sent back by <strong className="text-white font-black">{reviewerName}</strong>
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</h3>
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {task.description || 'No description provided.'}
        </p>
      </div>

      {/* Key Details Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Details</h3>
          {isAdmin && !isEditingExpected && (
            <button
              onClick={() => {
                setExpSitDate(task.expectedSitDeploymentDate || '');
                setExpUatDate(task.expectedUatDeploymentDate || '');
                setIsEditingExpected(true);
              }}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              ✏️ Edit Expected Dates
            </button>
          )}
        </div>

        {/* Admin Date Editing Card */}
        {isAdmin && isEditingExpected && (
          <div className="mb-4 p-4 rounded-xl border border-violet-500/30 bg-violet-500/[0.06] space-y-3">
            <div className="flex items-center justify-between border-b border-violet-500/20 pb-2">
              <span className="text-xs font-bold text-violet-300">Admin Controls — Update Expected Deployment Dates</span>
              <span className="text-[10px] text-zinc-400">Target SIT & UAT deadlines</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Expected SIT Deployment Date
                </label>
                <input
                  type="date"
                  value={expSitDate}
                  onChange={(e) => setExpSitDate(e.target.value)}
                  className="w-full h-8 bg-black/40 border border-white/10 rounded-lg px-2 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none hide-calendar-picker"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                  Expected UAT Deployment Date
                </label>
                <input
                  type="date"
                  value={expUatDate}
                  onChange={(e) => setExpUatDate(e.target.value)}
                  className="w-full h-8 bg-black/40 border border-white/10 rounded-lg px-2 text-xs text-zinc-200 focus:border-violet-500 focus:outline-none hide-calendar-picker"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingExpected(false)}
                className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingDates}
                onClick={handleSaveExpectedDates}
                className="px-3 py-1 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingDates ? 'Saving...' : 'Save Dates'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <InfoRow label="CR Type" value={task.type?.name} />
          <InfoRow label="Priority" value={task.priority} />
          <InfoRow label="Assigned Developer" value={task.assignedDeveloper?.fullName} />
          <InfoRow label="Code Reviewer / Approver" value={task.codeReviewer?.fullName || reviewerName} />
          <InfoRow label="Tester" value={task.tester?.fullName} />
          <InfoRow label="Efforts" value={task.efforts ? `${task.efforts}h` : undefined} />
          <InfoRow label="Branch" value={task.branchName} />
          <InfoRow label="Dev Start" value={formatDate(task.devStartDate)} />
          <InfoRow label="Expected SIT Deployment" value={formatDate(task.expectedSitDeploymentDate)} />
          <InfoRow label="Actual SIT Deployment" value={formatDate(task.sitDate)} />
          <InfoRow label="Expected UAT Deployment" value={formatDate(task.expectedUatDeploymentDate)} />
          <InfoRow label="Actual UAT Deployment" value={formatDate(task.uatDate)} />
          <InfoRow label="Production Date" value={formatDate(task.productionDate)} />
          <InfoRow label="Created" value={formatDate(task.createdDate)} />
          <InfoRow label="Updated" value={formatDate(task.updatedDate)} />
        </div>
      </div>

      {/* Deployment SLA status cards */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Deployment SLA Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SIT card */}
          {task.expectedSitDeploymentDate ? (
            <div className={`p-4 rounded-xl border ${
              task.sitDate 
                ? (task.sitDate <= task.expectedSitDeploymentDate ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400')
                : (new Date().toISOString().split('T')[0] <= task.expectedSitDeploymentDate ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400')
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">SIT Milestone</span>
                <span className="text-xs font-semibold">
                  {task.sitDate 
                    ? (task.sitDate <= task.expectedSitDeploymentDate ? '✅ On Time' : '🚨 Delayed')
                    : (new Date().toISOString().split('T')[0] <= task.expectedSitDeploymentDate ? '🕒 On Track' : '🚨 Missed')}
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Expected: {formatDate(task.expectedSitDeploymentDate)}
              </p>
              {task.sitDate ? (
                <p className="text-[11px] opacity-80">
                  Actual: {formatDate(task.sitDate)}
                </p>
              ) : (
                <p className="text-[11px] opacity-80">
                  {new Date().toISOString().split('T')[0] <= task.expectedSitDeploymentDate 
                    ? `${Math.ceil((new Date(task.expectedSitDeploymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                    : `${Math.ceil((new Date().getTime() - new Date(task.expectedSitDeploymentDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue`}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 text-xs">
              SIT Milestone not set.
            </div>
          )}

          {/* UAT card */}
          {task.expectedUatDeploymentDate ? (
            <div className={`p-4 rounded-xl border ${
              task.uatDate 
                ? (task.uatDate <= task.expectedUatDeploymentDate ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400')
                : (new Date().toISOString().split('T')[0] <= task.expectedUatDeploymentDate ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400')
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">UAT Milestone</span>
                <span className="text-xs font-semibold">
                  {task.uatDate 
                    ? (task.uatDate <= task.expectedUatDeploymentDate ? '✅ On Time' : '🚨 Delayed')
                    : (new Date().toISOString().split('T')[0] <= task.expectedUatDeploymentDate ? '🕒 On Track' : '🚨 Missed')}
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Expected: {formatDate(task.expectedUatDeploymentDate)}
              </p>
              {task.uatDate ? (
                <p className="text-[11px] opacity-80">
                  Actual: {formatDate(task.uatDate)}
                </p>
              ) : (
                <p className="text-[11px] opacity-80">
                  {new Date().toISOString().split('T')[0] <= task.expectedUatDeploymentDate 
                    ? `${Math.ceil((new Date(task.expectedUatDeploymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                    : `${Math.ceil((new Date().getTime() - new Date(task.expectedUatDeploymentDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue`}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 text-xs">
              UAT Milestone not set.
            </div>
          )}
        </div>
      </div>

      {/* Git Links */}
      {task.gitLinks && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Git Links</h3>
          <p className="text-sm text-sky-400 font-mono break-all">{task.gitLinks}</p>
        </div>
      )}

      {/* Unit Testing Document */}
      {task.unitTestDocUrl && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Unit Testing Document</h3>
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-teal-400 shrink-0">📄</span>
              <span className="text-sm text-teal-300 font-mono truncate">{task.unitTestDocName || 'Unit Test Document'}</span>
            </div>
            <button
              onClick={() => {
                if (!task.unitTestDocUrl) return;
                // Decode base64 and trigger download
                const link = document.createElement('a');
                link.href = task.unitTestDocUrl;
                link.download = task.unitTestDocName || 'unit_test_document';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="shrink-0 ml-3 px-3 py-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 border border-teal-500/30 hover:border-teal-400/50 hover:bg-teal-500/10 rounded-lg transition-all"
            >
              Download
            </button>
          </div>
        </div>
      )}

      {/* Remarks */}
      {task.remarks && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Remarks</h3>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{task.remarks}</p>
        </div>
      )}
    </div>
  );
}


interface Stage { key: string; label: string; icon: string }

function TimelineTab({ task, stages, currentStageIndex }: {
  task: Task;
  stages: Stage[];
  currentStageIndex: number;
}) {
  return (
    <div data-task-id={task.id}>
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-5">
        Workflow Progress
      </h3>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-5 top-6 bottom-6 w-px bg-white/10" />

        <div className="space-y-1">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-sky-500/10 border border-sky-500/20'
                    : 'border border-transparent'
                }`}
              >
                {/* Node */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2 ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : isCurrent
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                      : 'bg-white/[0.03] border-white/10 text-zinc-600'
                  }`}
                >
                  {isCompleted ? '✓' : isCurrent ? (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {stage.icon}
                    </motion.span>
                  ) : stage.icon}
                </div>

                {/* Label */}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isCompleted ? 'text-emerald-400' : isCurrent ? 'text-sky-300' : 'text-zinc-500'
                  }`}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-zinc-600 font-mono">{stage.key}</p>
                </div>

                {/* Current badge */}
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium">
                    Current
                  </span>
                )}
                {isCompleted && (
                  <span className="text-xs text-zinc-600">Done</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({
  crId,
  refreshTrigger,
  showUpload,
  onToggleUpload,
  onUploaded,
  canDelete,
}: {
  crId: number;
  refreshTrigger: number;
  showUpload: boolean;
  onToggleUpload: () => void;
  onUploaded: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Attached Documents
        </h3>
        <button
          onClick={onToggleUpload}
          className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors"
        >
          {showUpload ? '✕ Close Upload' : '⬆ Upload File'}
        </button>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <DocumentUpload crId={crId} onUploaded={onUploaded} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DocumentList
        crId={crId}
        refreshTrigger={refreshTrigger}
        canDelete={canDelete}
      />
    </div>
  );
}

function ActivityTab({
  groupedLogs,
  crId,
  timelineMode,
  setTimelineMode,
  searchQuery,
  setSearchQuery,
  actorFilter,
  setActorFilter,
  actionFilter,
  setActionFilter
}: {
  groupedLogs: any[];
  crId: number;
  timelineMode: 'tree' | 'chrono';
  setTimelineMode: (m: 'tree' | 'chrono') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  actorFilter: string;
  setActorFilter: (a: string) => void;
  actionFilter: string;
  setActionFilter: (a: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Created: true,
    Bug: true,
    Retest: true
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Extract unique actors for filtering
  const allFlatLogs = groupedLogs.flatMap(g => g.logs || []);
  const uniqueActorsMap = new Map<number, string>();
  allFlatLogs.forEach((log: any) => {
    if (log.changedBy) {
      uniqueActorsMap.set(log.changedBy.id, log.changedBy.fullName);
    }
  });
  const uniqueActors = Array.from(uniqueActorsMap.entries());

  // Extract unique action types / fieldNames
  const uniqueActions = Array.from(new Set(allFlatLogs.map((log: any) => log.fieldName).filter(Boolean)));

  const handleExport = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (actorFilter) params.append('actorId', actorFilter);
    if (actionFilter) params.append('actionType', actionFilter);

    fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/TASK/${crId}/export?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to export audit logs");
      return res.blob();
    })
    .then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        useTaskStore.getState().setDownloadTarget({
          base64Data,
          defaultFileName: `audit_history_TASK_${crId}.xlsx`
        });
      };
      reader.readAsDataURL(blob);
    })
    .catch(err => {
      useTaskStore.getState().addToast("Export failed: " + err.message, "error");
    });
  };

  const renderLogCard = (log: any) => (
    <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-sky-400 shrink-0">
        {log.changedBy?.fullName?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200">
          <span className="font-semibold text-zinc-100">{log.changedBy?.fullName ?? 'System'}</span>
          {' '}changed{' '}
          <span className="font-mono text-xs text-zinc-400 bg-white/5 px-1 py-0.5 rounded">{log.fieldName}</span>
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
          {log.oldValue && (
            <>
              <span className="text-rose-400 line-through">{log.oldValue}</span>
              <span className="text-zinc-600">→</span>
            </>
          )}
          <span className="text-emerald-400 font-medium">{log.newValue}</span>
        </div>
        {log.remarks && (
          <p className="text-xs text-zinc-400 mt-1.5 bg-black/20 p-1.5 rounded border border-white/[0.04] italic">
            "{log.remarks}"
          </p>
        )}
        <p className="text-[10px] text-zinc-500 mt-1">{formatDate(log.changedDate)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search and View Controls */}
      <div className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs bg-black/40 border border-white/[0.1] rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-500 placeholder:text-zinc-600 text-zinc-250"
          />
          <button 
            onClick={handleExport}
            className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1 shrink-0"
          >
            📥 Export
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="text-xs bg-black/40 border border-white/[0.1] rounded-lg px-2 py-1.5 outline-none text-zinc-300"
          >
            <option value="">All Actors</option>
            {uniqueActors.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-black/40 border border-white/[0.1] rounded-lg px-2 py-1.5 outline-none text-zinc-300"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((act: any) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex justify-between items-center border-t border-white/[0.04] pt-2 mt-1">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">View Mode</span>
          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setTimelineMode('tree')}
              className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${timelineMode === 'tree' ? 'bg-sky-500/20 text-sky-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              🌳 Tree View
            </button>
            <button
              onClick={() => setTimelineMode('chrono')}
              className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${timelineMode === 'chrono' ? 'bg-sky-500/20 text-sky-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              🕒 Chrono
            </button>
          </div>
        </div>
      </div>

      {/* Timeline List */}
      {timelineMode === 'chrono' ? (
        <div className="space-y-4 relative pl-4 border-l border-white/[0.06] ml-2">
          {allFlatLogs.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs">No records match filters.</div>
          ) : (
            allFlatLogs
              .sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime())
              .map((log: any) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-sky-500 border border-[#0b0f19] shadow" />
                  {renderLogCard(log)}
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {groupedLogs.map((group) => {
            const isExpanded = !!expandedGroups[group.groupName];
            const logsCount = group.logs?.length ?? 0;
            if (logsCount === 0) return null;

            return (
              <div key={group.groupName} className="border border-white/[0.06] rounded-xl bg-white/[0.01] overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.groupName)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{isExpanded ? '📂' : '📁'}</span>
                    <span className="text-xs font-bold text-zinc-300">{group.groupName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 font-bold text-zinc-400">
                      {logsCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold">{isExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
                {isExpanded && (
                  <div className="p-3 border-t border-white/[0.04] bg-black/20 space-y-2.5">
                    {group.logs.map((log: any) => renderLogCard(log))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommentsTab({
  comments,
  newComment,
  onChangeComment,
  onSubmit,
}: {
  comments: Comment[];
  newComment: string;
  onChangeComment: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="flex gap-3">
        <textarea
          value={newComment}
          onChange={(e) => onChangeComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit();
          }}
        />
        <button
          onClick={onSubmit}
          disabled={!newComment.trim()}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors self-end"
        >
          Post
        </button>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl">💬</span>
          <p className="text-zinc-500 text-sm mt-2">No comments yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                {comment.user?.fullName?.charAt(0) ?? '?'}
              </div>
              <div className="flex-1 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-200">{comment.user?.fullName}</span>
                  <span className="text-xs text-zinc-600">{formatDate(comment.createdDate)}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BugsTab({ taskId, onSelectBug }: { taskId: number; onSelectBug: (bugId: number) => void }) {
  const [bugs, setBugs] = useState<Array<{ id: number; jtrackId?: string; bugId?: string; title: string; status: string; severity: string; priority: string }>>([]);

  useEffect(() => {
    // Fetch bugs associated with this task — filter by bugTaskId
    fetch(`${APP_CONFIG.apiUrl}/api/bugs?page=0&size=50`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const content = data.content ?? [];
        setBugs(content.filter((b: { bugTask?: { id: number } }) => b.bugTask?.id === taskId));
      })
      .catch(() => setBugs([]));
  }, [taskId]);

  if (bugs.length === 0) {
    return (
      <div className="text-center py-10">
        <span className="text-3xl">🐛</span>
        <p className="text-zinc-500 text-sm mt-2">No bugs raised for this CR</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bugs.map((bug) => (
        <div
          key={bug.id}
          onClick={() => onSelectBug(bug.id)}
          className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-sky-500/30 transition-all cursor-pointer text-left"
        >
          <span className="font-mono text-xs text-zinc-500">{bug.bugId ?? bug.jtrackId}</span>
          <span className="flex-1 text-sm text-zinc-200 font-medium hover:underline">{bug.title}</span>
          <span className="text-xs text-zinc-400">{bug.severity}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">{bug.status}</span>
        </div>
      ))}
    </div>
  );
}

function ApprovalTab({
  task,
  currentUser,
  onStatusChange,
}: {
  task: Task;
  currentUser?: User | null;
  onStatusChange?: () => void;
}) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isCodeReview = task.status === 'CODE_REVIEW';
  const isAdmin = currentUser?.roles?.some((r) => r.includes('CODEREVIEWER') || r.includes('ADMIN'));

  const handleApprove = async () => {
    if (!remarks.trim()) { setMessage('Remarks are required for approval.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'CODE_REVIEW_DONE', remarks }),
      });
      if (res.ok) {
        setMessage('✓ Approved successfully');
        onStatusChange?.();
      } else {
        const err = await res.text();
        setMessage(`Error: ${err}`);
      }
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBack = async () => {
    if (!remarks.trim()) { setMessage('Remarks are required to send back.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'CHANGES_REQUESTED', remarks }),
      });
      if (res.ok) {
        setMessage('↩ Sent back to developer');
        onStatusChange?.();
      } else {
        const err = await res.text();
        setMessage(`Error: ${err}`);
      }
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isCodeReview) {
    return (
      <div className="text-center py-10">
        <span className="text-3xl">✅</span>
        <p className="text-zinc-400 text-sm mt-2">
          {task.status === 'CODE_REVIEW_DONE'
            ? 'Code review has been approved.'
            : 'No approval action needed for current status.'}
        </p>
        <p className="text-xs text-zinc-600 mt-1">Current status: {task.status}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <p className="text-sm text-amber-300 font-medium">⚠ Pending Code Review</p>
        <p className="text-xs text-amber-400/70 mt-1">
          This CR is awaiting code review approval. Git Links: {task.gitLinks || 'Not provided'}
        </p>
      </div>

      {isAdmin ? (
        <div className="space-y-3">
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter mandatory review remarks..."
            rows={4}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50 resize-none"
          />

          {message && (
            <p className={`text-sm ${message.startsWith('✓') || message.startsWith('↩') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={loading || !remarks.trim()}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? '...' : '✓ Approve Code Review'}
            </button>
            <button
              onClick={handleSendBack}
              disabled={loading || !remarks.trim()}
              className="flex-1 py-2.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-40 text-rose-400 text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? '...' : '↩ Send Back'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          You don't have permission to approve code reviews. Contact a Code Reviewer or Admin.
        </p>
      )}
    </div>
  );
}

export default CRDetailSlideOver;
