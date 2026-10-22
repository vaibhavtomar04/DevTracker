/**
 * CRDetailSlideOver — Full CR detail panel with 7 tabs
 *
 * Tabs: Overview | Timeline | Documents | Activity | Comments | Bugs | Approval
 *
 * Opens as a slide-over from the right, consistent with the app's panel pattern.
 * Displays all CR metadata, visual workflow timeline, document list with upload,
 * audit activity, comments, bug history, and approval workflow.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Task, type User } from '../../services/mockData';
import { QualityRiskBadge } from './QualityRiskBadge';
import { DocumentList } from './DocumentList';
import { DocumentUpload } from './DocumentUpload';
import { documentPreviewUrl, downloadDocument, uploadDocument } from '../../services/document.service';
import { useTaskStore } from '../../store/taskStore';
import BugDetailModal from './BugDetailModal';
import { APP_CONFIG } from '@/config/appConfig';
import { getCRStatusBadgeClass } from '@/utils/statusColors';
import { fmtDate } from '@/utils/dateFormat';
import { getAssignedDevNames } from '@/utils/devUtils';
import {
  Mail,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  GitBranch as GitBranchIcon,
  Server as ServerIcon,
  FileText as FileTextIcon,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Layers,
  Code2,
  Edit3,
  Save,
  Upload,
  X,
} from 'lucide-react';



interface Comment {
  id: number;
  text: string;
  user: User;
  createdDate: string;
}

type Tab = 'overview' | 'timeline' | 'documents' | 'activity' | 'comments' | 'bugs' | 'resendMail' | 'approval';

interface CRDetailSlideOverProps {
  crId: number | null;
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
  currentUser?: User | null;
  initialTab?: Tab;
  onDelete?: (task: Task) => void;
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

const PRE_CODE_REVIEW_STAGES = new Set([
  'OPEN',
  'IN_PROGRESS',
  'DEV_IN_PROGRESS',
  'DEV_COMPLETED',
  'SIT_DEPLOYED',
  'SIT_TESTING',
  'SIT_COMPLETED',
]);

const TESTING_STAGE_SET = new Set([
  'MOVE_TO_UAT',
  'TESTING_POOL',
  'UAT_TESTING',
  'TESTING_IN_PROGRESS',
  'BUG_FOUND',
  'RETESTING',
  'UAT_COMPLETED',
  'TESTING_COMPLETED',
  'PROD_DEPLOYED',
  'PROD_COMPLETED',
  'CLOSED',
]);

export function isStageBeforeCodeReview(status?: string | null): boolean {
  if (!status) return true;
  const s = status.toUpperCase();
  if (PRE_CODE_REVIEW_STAGES.has(s)) return true;
  const stageOrder = [
    'OPEN', 'IN_PROGRESS', 'SIT_DEPLOYED', 'SIT_TESTING', 'SIT_COMPLETED',
    'CODE_REVIEW', 'CHANGES_REQUESTED', 'CODE_REVIEW_DONE',
    'MOVE_TO_UAT', 'TESTING_POOL', 'UAT_TESTING', 'TESTING_IN_PROGRESS', 'BUG_FOUND', 'RETESTING',
    'UAT_COMPLETED', 'TESTING_COMPLETED', 'PROD_DEPLOYED', 'PROD_COMPLETED', 'CLOSED'
  ];
  const idx = stageOrder.indexOf(s);
  const crIdx = stageOrder.indexOf('CODE_REVIEW');
  if (idx !== -1 && idx < crIdx) return true;
  return false;
}

export function isStageInTestingOrLater(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  if (TESTING_STAGE_SET.has(s)) return true;
  const stageOrder = [
    'OPEN', 'IN_PROGRESS', 'SIT_DEPLOYED', 'SIT_TESTING', 'SIT_COMPLETED',
    'CODE_REVIEW', 'CHANGES_REQUESTED', 'CODE_REVIEW_DONE',
    'MOVE_TO_UAT', 'TESTING_POOL', 'UAT_TESTING', 'TESTING_IN_PROGRESS', 'BUG_FOUND', 'RETESTING',
    'UAT_COMPLETED', 'TESTING_COMPLETED', 'PROD_DEPLOYED', 'PROD_COMPLETED', 'CLOSED'
  ];
  const idx = stageOrder.indexOf(s);
  const uatIdx = stageOrder.indexOf('MOVE_TO_UAT');
  if (idx !== -1 && idx >= uatIdx) return true;
  return false;
}

export function isStageReviewDoneOrLater(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  if (isStageInTestingOrLater(s)) return true;
  return s === 'CODE_REVIEW_DONE' || s.includes('APPROVED');
}

export function isStageUatCompletedOrLater(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return ['UAT_COMPLETED', 'TESTING_COMPLETED', 'PROD_DEPLOYED', 'PROD_COMPLETED', 'CLOSED'].includes(s);
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📋' },
  { key: 'timeline', label: 'Timeline', icon: '📅' },
  { key: 'documents', label: 'Documents', icon: '📎' },
  { key: 'activity', label: 'Activity', icon: '📊' },
  { key: 'comments', label: 'Comments', icon: '💬' },
  { key: 'bugs', label: 'Bugs', icon: '🐛' },
  { key: 'resendMail', label: 'Resend Mail', icon: '✉' },
];

// Using shared fmtDate from dateFormat.ts — DD/MM/YYYY
const formatDate = (dateStr?: string | null) => fmtDate(dateStr);

export const CRDetailSlideOver: React.FC<CRDetailSlideOverProps> = ({
  crId,
  task,
  open,
  onClose,
  onStatusChange,
  currentUser,
  initialTab,
  onDelete,
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
  const [detail, setDetail] = useState<Task | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isPreCodeReview = isStageBeforeCodeReview(task?.status);

  // Tabs filtered by flow: If CR is before Code Review, completely hide 'Resend Mail' tab
  const visibleTabs = useMemo(() => {
    return TABS.filter((tab) => {
      if (tab.key === 'resendMail') {
        return !isPreCodeReview;
      }
      return true;
    });
  }, [isPreCodeReview]);

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

  // Fetch full detail (TaskDetailDto) when the panel opens. The injected `task`
  // is the lean list DTO; detail-only fields (remarks, codeReviewer, unit-test
  // document, etc.) are loaded on demand from GET /api/tasks/{id}/detail.
  useEffect(() => {
    if (open && crId) {
      setDetail(null);
      fetch(`${APP_CONFIG.apiUrl}/api/tasks/${crId}/detail`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setDetail(data))
        .catch(() => setDetail(null));
    }
  }, [open, crId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset tab when opening a new task or if current tab is hidden
  useEffect(() => {
    if (open) {
      let targetTab = (initialTab as string) === 'approval' ? 'resendMail' : (initialTab || 'overview');
      if (targetTab === 'resendMail' && isPreCodeReview) {
        targetTab = 'overview';
      }
      setActiveTab(targetTab as Tab);
      setSelectedBugId(null);
    }
  }, [crId, open, initialTab, isPreCodeReview]);

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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getCRStatusBadgeClass(task.status)}`}>
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
                    Created by {task.createdBy?.fullName || task.createdBy?.username || '—'} · {formatDate(task.createdDate)}
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
                {visibleTabs.map((tab) => (
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
                  {activeTab === 'overview' && <OverviewTab task={detail ?? task} currentUser={currentUser} onDelete={onDelete} />}
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
                  {(activeTab === 'resendMail' || (activeTab as string) === 'approval') && (
                    <ResendMailTab task={detail ?? task} currentUser={currentUser} onStatusChange={onStatusChange} />
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

function OverviewTab({ task, currentUser, onDelete }: { task: Task; currentUser?: User | null; onDelete?: (task: Task) => void }) {
  const { updateTask, addToast } = useTaskStore();
  const isAdmin = (currentUser?.roles?.some(r => r.includes('ADMIN') || r.includes('DEVADMIN') || r.includes('TESTADMIN')) ?? false) || (currentUser as any)?.role?.includes('ADMIN');

  const [isEditingExpected, setIsEditingExpected] = useState(false);
  const [expSitDate, setExpSitDate] = useState(task.expectedSitDeploymentDate || '');
  const [expUatDate, setExpUatDate] = useState(task.expectedUatDeploymentDate || '');
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [entityAudit, setEntityAudit] = useState<any[]>([]);

  useEffect(() => {
    if (task?.id) {
      fetch(`${APP_CONFIG.apiUrl}/api/audit/TASK/${task.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then((r) => r.json())
        .then((data) => setEntityAudit(Array.isArray(data) ? data : []))
        .catch(() => setEntityAudit([]));
    }
  }, [task?.id]);

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

  const rejectLog = entityAudit.find((l: any) => l.fieldName === 'workflow_reject');

  const reviewerName = typeof rejectLog?.changedBy === 'object' && rejectLog?.changedBy?.fullName 
    ? rejectLog.changedBy.fullName 
    : (typeof rejectLog?.changedBy === 'string' ? rejectLog.changedBy : (task.codeReviewer?.fullName || 'Code Reviewer'));

  const displayRemarks = rejectLog?.remarks || task.remarks;

  // Last status change — for multi-developer "Who moved this CR" display
  const lastStatusLog = entityAudit.filter((l: any) => l.fieldName === 'status').at(-1);
  const lastMovedByName = lastStatusLog?.changedBy?.fullName || lastStatusLog?.changedBy || null;
  const lastMovedToStatus = lastStatusLog?.newValue?.replace(/_/g, ' ') || null;

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
                  lang="en-GB"
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
                  lang="en-GB"
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
          <InfoRow label={task.developers && task.developers.length > 1 ? "Assigned Developers" : "Assigned Developer"} value={getAssignedDevNames(task)} />
          <InfoRow label="Code Reviewer / Approver" value={task.codeReviewer?.fullName || reviewerName} />
          <InfoRow label="Tester" value={task.tester?.fullName} />
          <InfoRow label="Efforts" value={task.efforts ? `${task.efforts}h` : undefined} />
          <InfoRow label="Branch" value={task.branchName} />
          <InfoRow label="Dev Start" value={formatDate(task.devStartDate)} />
          {lastMovedByName && (
            <InfoRow label="Last Status Change By" value={`${lastMovedByName}${lastMovedToStatus ? ` → ${lastMovedToStatus}` : ''}`} />
          )}
          <InfoRow label="Expected SIT Deployment" value={formatDate(task.expectedSitDeploymentDate)} />
          <InfoRow label="Actual SIT Deployment" value={formatDate(task.sitDate)} />
          <InfoRow label="Expected UAT Deployment" value={formatDate(task.expectedUatDeploymentDate)} />
          <InfoRow label="Actual UAT Deployment" value={formatDate(task.uatDate)} />
          <InfoRow label="Production Date" value={formatDate(task.productionDate)} />
          <InfoRow label="Created" value={formatDate(task.createdDate)} />
          <InfoRow label="Updated" value={formatDate(task.updatedDate)} />
        </div>

        {/* Multi-Developer Section */}
        {task.developers && task.developers.length > 0 && (
          <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-violet-400 mb-3 flex items-center gap-1.5">
              <span>👥</span> All Assigned Developers ({task.developers.length})
            </h4>
            <div className="space-y-2">
              {(task.developers as any[]).map((td: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {(td.developer?.fullName || 'D')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{td.developer?.fullName || '—'}</p>
                      {td.branchName && <p className="text-[10px] text-zinc-500 font-mono">{td.branchName}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    {typeof td.progress === 'number' && (
                      <p className="text-[10px] font-semibold text-emerald-400">{td.progress}%</p>
                    )}
                    {td.devStartDate && (
                      <p className="text-[10px] text-zinc-500">Started: {formatDate(td.devStartDate)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* Unit Testing Document — served from the Documents subsystem (no base64) */}
      {task.unitTestDocId && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Unit Testing Document</h3>
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5">
            <div className="flex items-center gap-2.5 min-w-0">
              {/\.(png|jpe?g|gif|webp)$/i.test(task.unitTestDocName || '') ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-teal-500/20 shrink-0 bg-black/30">
                  <img src={documentPreviewUrl(task.unitTestDocId)} alt={task.unitTestDocName || 'Unit test document'} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <span className="text-teal-400 shrink-0">📄</span>
              )}
              <span className="text-sm text-teal-300 font-mono truncate">{task.unitTestDocName || 'Unit Test Document'}</span>
            </div>
            <button
              onClick={() => task.unitTestDocId && downloadDocument(task.unitTestDocId, task.unitTestDocName || 'unit_test_document')}
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

      {/* Delete CR button for Admins */}
      {onDelete && isAdmin && (
        <div className="border-t border-white/[0.06] pt-4 mt-6">
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl py-2.5 px-4 transition-all duration-200 cursor-pointer"
          >
            <span>🗑</span> Delete Change Request
          </button>
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
      const actorName = typeof log.changedBy === 'object'
        ? (log.changedBy.fullName || log.changedBy.username || 'System')
        : String(log.changedBy);
      const actorId = log.changedBy?.id ?? actorName;
      uniqueActorsMap.set(actorId, actorName);
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

function ResendMailTab({
  task,
  currentUser,
  onStatusChange,
}: {
  task: Task;
  currentUser?: User | null;
  onStatusChange?: () => void;
}) {
  const rawRoles = currentUser?.roles || [];
  const userRoles = rawRoles.map((r: any) =>
    (typeof r === 'string' ? r : r?.name || '').replace(/^ROLE_/, '').toUpperCase()
  );

  const isDeveloper = userRoles.includes('DEVELOPER');
  const isReviewer = userRoles.some((r) => ['CODEREVIEWER', 'DEVADMIN', 'ADMIN'].includes(r));
  const isTester = userRoles.some((r) => ['TESTER', 'TESTADMIN'].includes(r));
  const isSuperAdmin = userRoles.some((r) => ['DEVADMIN', 'ADMIN'].includes(r));

  const canSeeDeveloper = isDeveloper || isSuperAdmin;
  const canSeeReviewer = isReviewer || isSuperAdmin;
  const canSeeTester = isTester || isSuperAdmin;

  const [currentTask, setCurrentTask] = useState<Task>(task);
  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  // Workflow flow checks for dynamic options
  const showCRStream = canSeeDeveloper && !isStageBeforeCodeReview(currentTask.status);
  const showDevOpsStream = canSeeDeveloper && isStageReviewDoneOrLater(currentTask.status);
  const showTestingStream = canSeeDeveloper && isStageInTestingOrLater(currentTask.status);
  const showReviewerDoneStream = canSeeReviewer && (isStageReviewDoneOrLater(currentTask.status) || currentTask.status === 'CODE_REVIEW');
  const showTesterCompleteStream = canSeeTester && isStageInTestingOrLater(currentTask.status);

  type ResendStreamType = 'code_review' | 'devops' | 'reviewer_done' | 'testing' | 'uat_completed';

  const availableStreams = useMemo(() => {
    const list: ResendStreamType[] = [];
    if (showCRStream) list.push('code_review');
    if (showDevOpsStream) list.push('devops');
    if (showReviewerDoneStream) list.push('reviewer_done');
    if (showTestingStream) list.push('testing');
    if (showTesterCompleteStream) list.push('uat_completed');
    return list;
  }, [showCRStream, showDevOpsStream, showReviewerDoneStream, showTestingStream, showTesterCompleteStream]);

  const [selectedStream, setSelectedStream] = useState<ResendStreamType>('code_review');
  const [customRemarks, setCustomRemarks] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-switch selectedStream if currently selected stream is not available
  useEffect(() => {
    if (!availableStreams.includes(selectedStream)) {
      if (availableStreams.length > 0) {
        setSelectedStream(availableStreams[0]);
      }
    }
  }, [availableStreams, selectedStream]);

  // Loading and status feedback
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Saving details state
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states for Stream 1 (Code Review)
  const [isEditingCR, setIsEditingCR] = useState(false);
  const [editBranchName, setEditBranchName] = useState(currentTask.branchName || '');
  const [editGitLinks, setEditGitLinks] = useState(currentTask.gitLinks || '');
  const [editCRRemarks, setEditCRRemarks] = useState(currentTask.remarks || '');

  // Edit states for Stream 2 (DevOps)
  const [isEditingDevOps, setIsEditingDevOps] = useState(false);
  const [editServerPath, setEditServerPath] = useState(currentTask.serverPath || '');
  const [editItemsToDeploy, setEditItemsToDeploy] = useState(currentTask.itemsToDeploy || '');
  const [editDeploymentNote, setEditDeploymentNote] = useState(currentTask.deploymentNote || '');
  const [editSendDevOpsMail, setEditSendDevOpsMail] = useState(currentTask.sendDevOpsMail !== false);

  // Edit states for Stream 3 (Testing Team)
  const [isEditingTesting, setIsEditingTesting] = useState(false);
  const [editTestingComments, setEditTestingComments] = useState(currentTask.testingComments || '');

  // Edit states for Stream 4 (Reviewer Done)
  const [isEditingReviewerDone, setIsEditingReviewerDone] = useState(false);
  const [editReviewerDoneRemarks, setEditReviewerDoneRemarks] = useState(currentTask.remarks || '');

  // Edit states for Stream 5 (Tester Complete)
  const [isEditingTesterComplete, setIsEditingTesterComplete] = useState(false);
  const [editTesterCompleteComments, setEditTesterCompleteComments] = useState(currentTask.testingComments || '');

  // Review approval actions (when status === 'CODE_REVIEW')
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewActionMsg, setReviewActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const copyText = (val: string, key: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveDetails = async (
    payload: Record<string, any>,
    successMsg: string,
    onSuccessCallback?: () => void
  ) => {
    setIsSavingDetails(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${currentTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        setCurrentTask((prev) => ({
          ...prev,
          ...payload,
          ...(updated && typeof updated === 'object' ? updated : {}),
        }));
        setStatusMessage({ text: `✓ ${successMsg}`, ok: true });
        onSuccessCallback?.();
        onStatusChange?.();
      } else {
        const errText = await res.text();
        setStatusMessage({ text: `✕ Failed to save details: ${errText || res.statusText}`, ok: false });
      }
    } catch (e: any) {
      setStatusMessage({ text: `✕ Network error: ${e.message}`, ok: false });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDoc(true);
    setStatusMessage(null);
    try {
      const doc = await uploadDocument(currentTask.id, 'UNIT_TEST', file);
      await handleSaveDetails(
        { unitTestDocId: doc.id, unitTestDocName: doc.filename },
        `Attached unit test document "${doc.filename}" successfully.`
      );
    } catch (err: any) {
      setStatusMessage({ text: `✕ Document upload failed: ${err?.message || 'Error'}`, ok: false });
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResendMail = async (emailType: string, flowLabel: string) => {
    setIsSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${currentTask.id}/mail/resend?type=${encodeURIComponent(emailType)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: emailType,
          remarks: customRemarks.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setStatusMessage({
          text: `✓ ${data.message || `${flowLabel} email resent successfully!`}`,
          ok: true,
        });
        setCustomRemarks('');
      } else {
        setStatusMessage({
          text: `✕ ${data?.message || `Failed to resend ${flowLabel} email`}`,
          ok: false,
        });
      }
    } catch (e: any) {
      setStatusMessage({ text: `✕ Network error: ${e.message}`, ok: false });
    } finally {
      setIsSending(false);
    }
  };

  const handleResetThread = async (flowType: string, flowLabel: string) => {
    if (
      !confirm(
        `Reset email thread for ${flowLabel} (CR ${currentTask.jtrackId || `#${currentTask.id}`})?\n\nThis clears stale thread references so the next email initiates a fresh, clean message thread.`
      )
    ) {
      return;
    }
    setIsResetting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${currentTask.id}/mail/reset?flowType=${encodeURIComponent(flowType)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setStatusMessage({
          text: `✓ ${data.message || `${flowLabel} thread reset successfully!`}`,
          ok: true,
        });
      } else {
        setStatusMessage({
          text: `✕ ${data?.message || `Failed to reset ${flowLabel} thread`}`,
          ok: false,
        });
      }
    } catch (e: any) {
      setStatusMessage({ text: `✕ Network error: ${e.message}`, ok: false });
    } finally {
      setIsResetting(false);
    }
  };

  const handleApproveCodeReview = async () => {
    if (!reviewRemarks.trim()) {
      setReviewActionMsg({ text: 'Review remarks are mandatory for approval.', ok: false });
      return;
    }
    setReviewLoading(true);
    setReviewActionMsg(null);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${currentTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'CODE_REVIEW_DONE', remarks: reviewRemarks.trim() }),
      });
      if (res.ok) {
        setReviewActionMsg({ text: '✓ Code Review approved successfully. Email dispatched to developer.', ok: true });
        setReviewRemarks('');
        onStatusChange?.();
      } else {
        const err = await res.text();
        setReviewActionMsg({ text: `✕ Approval failed: ${err}`, ok: false });
      }
    } catch (e: any) {
      setReviewActionMsg({ text: `✕ Network error: ${e.message}`, ok: false });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewRemarks.trim()) {
      setReviewActionMsg({ text: 'Review remarks are required to request changes.', ok: false });
      return;
    }
    setReviewLoading(true);
    setReviewActionMsg(null);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks/${currentTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'CHANGES_REQUESTED', remarks: reviewRemarks.trim() }),
      });
      if (res.ok) {
        setReviewActionMsg({ text: '↩ Changes requested. Sent back to developer.', ok: true });
        setReviewRemarks('');
        onStatusChange?.();
      } else {
        const err = await res.text();
        setReviewActionMsg({ text: `✕ Failed to send back: ${err}`, ok: false });
      }
    } catch (e: any) {
      setReviewActionMsg({ text: `✕ Network error: ${e.message}`, ok: false });
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Global Status Banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
            statusMessage.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="text-sm shrink-0">{statusMessage.ok ? '✓' : '⚠'}</span>
          <p className="flex-1 leading-relaxed">{statusMessage.text}</p>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-zinc-500 hover:text-white text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Available Mail Streams Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Available Mail Streams ({availableStreams.length} Option{availableStreams.length === 1 ? '' : 's'})
          </span>
          <span className="text-[11px] text-zinc-500">
            Click any stream to view/edit details & resend emails
          </span>
        </div>

        {/* Dynamic Clickable Category Selector Cards according to CR Status & Role */}
        <div className={`grid grid-cols-1 ${
          availableStreams.length === 1
            ? 'sm:grid-cols-1 max-w-sm'
            : availableStreams.length === 2
            ? 'sm:grid-cols-2'
            : availableStreams.length === 3
            ? 'sm:grid-cols-3'
            : 'sm:grid-cols-2 lg:grid-cols-4'
        } gap-3`}>
          {/* Card 1: Code Review Mail */}
          {showCRStream && (
            <button
              type="button"
              onClick={() => { setSelectedStream('code_review'); setStatusMessage(null); }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedStream === 'code_review'
                  ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/40 shadow-lg'
                  : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <GitBranchIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  Code Review
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Code Review Mail</h4>
              <p className="text-[11px] text-zinc-400 truncate">
                Branch: {currentTask.branchName || 'Not specified'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                Reviewer: {currentTask.approver?.fullName || (currentTask as any).codeReviewer?.fullName || 'Assigned'}
              </p>
            </button>
          )}

          {/* Card 2: DevOps Deployment Notes Mail */}
          {showDevOpsStream && (
            <button
              type="button"
              onClick={() => { setSelectedStream('devops'); setStatusMessage(null); }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedStream === 'devops'
                  ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40 shadow-lg'
                  : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
                  <ServerIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                  DevOps Notes
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Deployment Notes</h4>
              <p className="text-[11px] text-zinc-400 truncate">
                {currentTask.deploymentNote ? 'Notes recorded' : 'Standard deploy'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                Path: {currentTask.serverPath || 'Server-1.42'}
              </p>
            </button>
          )}

          {/* Card 3: Code Review Done Mail */}
          {showReviewerDoneStream && (
            <button
              type="button"
              onClick={() => { setSelectedStream('reviewer_done'); setStatusMessage(null); }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedStream === 'reviewer_done'
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-lg'
                  : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Review Done
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Code Review Done</h4>
              <p className="text-[11px] text-zinc-400 truncate">
                {currentTask.status === 'CODE_REVIEW' ? 'Decision Pending' : (currentTask.remarks || 'Approved & notified')}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                Reviewer: {currentTask.approver?.fullName || (currentTask as any).codeReviewer?.fullName || 'Assigned'}
              </p>
            </button>
          )}

          {/* Card 4: Mail to Testing Team */}
          {showTestingStream && (
            <button
              type="button"
              onClick={() => { setSelectedStream('testing'); setStatusMessage(null); }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedStream === 'testing'
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-lg'
                  : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileTextIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Testing Team
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Mail to Testing Team</h4>
              <p className="text-[11px] text-zinc-400 truncate">
                Tester: {currentTask.tester?.fullName || 'QA Team'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                Doc: {currentTask.unitTestDocName || 'Attached/Ready'}
              </p>
            </button>
          )}

          {/* Card 5: UAT Testing Completed Mail */}
          {showTesterCompleteStream && (
            <button
              type="button"
              onClick={() => { setSelectedStream('uat_completed'); setStatusMessage(null); }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedStream === 'uat_completed'
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-lg'
                  : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  UAT Sign-off
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-1">UAT Completed Mail</h4>
              <p className="text-[11px] text-zinc-400 truncate">
                {isStageUatCompletedOrLater(currentTask.status) ? (currentTask.testingComments || 'Testing Passed') : 'Sign-off pending'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                Tester: {currentTask.tester?.fullName || 'QA Team'}
              </p>
            </button>
          )}
        </div>

        {/* Contextual Flow Callout for Developer */}
        {canSeeDeveloper && !showTestingStream && showDevOpsStream && (
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-2">
            <span className="text-base shrink-0">💡</span>
            <span>CR is approved. Fill DevOps deployment notes to transition to testing stage. &quot;Mail to Testing Team&quot; option will become available once moved to testing.</span>
          </div>
        )}

        {canSeeDeveloper && !showDevOpsStream && currentTask.status === 'CODE_REVIEW' && (
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2">
            <span className="text-base shrink-0">ℹ</span>
            <span>CR is awaiting Code Review approval. DevOps deployment notes and testing mail options will become available as the CR progresses.</span>
          </div>
        )}

        {availableStreams.length === 0 && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-zinc-400 flex items-center gap-2.5">
            <span className="text-base text-amber-400 shrink-0">ℹ</span>
            <span>No mail streams are available for your role at the current stage ({currentTask.status}).</span>
          </div>
        )}

        {/* Expanded Detail Panel for Selected Mail Stream */}
        {availableStreams.length > 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5">
          {/* SUB-SECTION 1: CODE REVIEW MAIL */}
          {selectedStream === 'code_review' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Details Filled for Code Review</h4>
                      <p className="text-xs text-zinc-400">
                        Information submitted when moving this CR to Code Review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      flowType: CODE_REVIEW
                    </span>
                    {!isEditingCR ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditBranchName(currentTask.branchName || '');
                          setEditGitLinks(currentTask.gitLinks || '');
                          setEditCRRemarks(currentTask.remarks || (currentTask as any).codeReviewComments || '');
                          setIsEditingCR(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                        Edit Details
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSavingDetails}
                          onClick={() => setIsEditingCR(false)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingDetails}
                          onClick={() =>
                            handleSaveDetails(
                              {
                                branchName: editBranchName.trim(),
                                gitLinks: editGitLinks.trim(),
                                remarks: editCRRemarks.trim(),
                              },
                              'Code Review details updated successfully.',
                              () => setIsEditingCR(false)
                            )
                          }
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingDetails ? 'Saving...' : 'Save Details'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content View / Edit Mode */}
                {isEditingCR ? (
                  <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.02] border border-sky-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          Git Branch Name *
                        </label>
                        <input
                          type="text"
                          value={editBranchName}
                          onChange={(e) => setEditBranchName(e.target.value)}
                          placeholder="e.g. feature/CR-8528"
                          className="w-full bg-black/50 border border-white/15 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          Git / PR Link *
                        </label>
                        <input
                          type="text"
                          value={editGitLinks}
                          onChange={(e) => setEditGitLinks(e.target.value)}
                          placeholder="e.g. https://github.com/org/repo/pull/123"
                          className="w-full bg-black/50 border border-white/15 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Developer Review Remarks / Description
                      </label>
                      <textarea
                        rows={3}
                        value={editCRRemarks}
                        onChange={(e) => setEditCRRemarks(e.target.value)}
                        placeholder="Enter remarks or implementation summary for the reviewer..."
                        className="w-full bg-black/50 border border-white/15 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-y"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Git Branch</span>
                          {currentTask.branchName && (
                            <button
                              type="button"
                              onClick={() => copyText(currentTask.branchName || '', 'branch')}
                              className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === 'branch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedKey === 'branch' ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                        <span className="text-xs font-mono text-zinc-200 font-semibold block truncate">
                          {currentTask.branchName || 'Not specified'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Git / PR Link</span>
                          {currentTask.gitLinks && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyText(currentTask.gitLinks || '', 'gitLinks')}
                                className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === 'gitLinks' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copiedKey === 'gitLinks' ? 'Copied' : 'Copy'}
                              </button>
                              {currentTask.gitLinks.startsWith('http') && (
                                <a
                                  href={currentTask.gitLinks}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-mono text-zinc-200 font-semibold block truncate">
                          {currentTask.gitLinks || 'Not specified'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                          Assigned Reviewer / Approver
                        </span>
                        <span className="text-xs text-zinc-200 font-medium">
                          {currentTask.approver?.fullName || (currentTask as any).codeReviewer?.fullName || 'Assigned Reviewer Pool'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                          Estimated Efforts
                        </span>
                        <span className="text-xs text-zinc-200 font-medium">
                          {currentTask.efforts ? `${currentTask.efforts} hrs` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Developer Review Remarks / Description
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {currentTask.remarks || (currentTask as any).codeReviewComments || currentTask.description || 'No developer remarks recorded.'}
                      </p>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-white/[0.06] space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Custom Remarks for Resend (Optional override)
                    </label>
                    <input
                      type="text"
                      value={customRemarks}
                      onChange={(e) => setCustomRemarks(e.target.value)}
                      placeholder="Add an optional note to include with this resend..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={isSending || isResetting || isSavingDetails}
                      onClick={() => handleResendMail('CODE_REVIEW_REQUEST', 'Code Review Request')}
                      className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSending ? 'Sending Request...' : '✉ Resend Code Review Mail'}
                    </button>
                    <button
                      type="button"
                      disabled={isSending || isResetting || isSavingDetails}
                      onClick={() => handleResetThread('CODE_REVIEW', 'Code Review')}
                      className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      title="Clears thread references so the next email starts a fresh thread"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isResetting ? 'Resetting...' : '↻ Reset Mail Thread'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 2: DEPLOYMENT NOTES TO DEVOPS */}
            {selectedStream === 'devops' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Details Filled for DevOps Deployment</h4>
                      <p className="text-xs text-zinc-400">
                        Deployment instructions and artifacts submitted for the DevOps team
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      flowType: DEVOPS_DEPLOYMENT
                    </span>
                    {!isEditingDevOps ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditServerPath(currentTask.serverPath || 'Server-1.42: /var/deploy');
                          setEditItemsToDeploy(currentTask.itemsToDeploy || '');
                          setEditDeploymentNote(currentTask.deploymentNote || currentTask.remarks || '');
                          setEditSendDevOpsMail(currentTask.sendDevOpsMail !== false);
                          setIsEditingDevOps(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                        Edit Details
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSavingDetails}
                          onClick={() => setIsEditingDevOps(false)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingDetails}
                          onClick={() =>
                            handleSaveDetails(
                              {
                                serverPath: editServerPath.trim(),
                                itemsToDeploy: editItemsToDeploy.trim(),
                                deploymentNote: editDeploymentNote.trim(),
                                sendDevOpsMail: editSendDevOpsMail,
                              },
                              'DevOps deployment details updated successfully.',
                              () => setIsEditingDevOps(false)
                            )
                          }
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-violet-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingDetails ? 'Saving...' : 'Save Details'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content View / Edit Mode */}
                {isEditingDevOps ? (
                  <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          Target Server & Path
                        </label>
                        <input
                          type="text"
                          value={editServerPath}
                          onChange={(e) => setEditServerPath(e.target.value)}
                          placeholder="e.g. Server-1.42: /var/deploy"
                          className="w-full bg-black/50 border border-white/15 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                          DevOps Notification Trigger
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={editSendDevOpsMail}
                            onChange={(e) => setEditSendDevOpsMail(e.target.checked)}
                            className="w-4 h-4 rounded text-violet-600 bg-black/40 border-white/20 focus:ring-violet-500 cursor-pointer"
                          />
                          <span className="text-xs text-zinc-300 font-medium">Send deployment email to DevOps</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Items / Artifacts to Deploy
                      </label>
                      <input
                        type="text"
                        value={editItemsToDeploy}
                        onChange={(e) => setEditItemsToDeploy(e.target.value)}
                        placeholder="e.g. build.jar, config.properties, migration.sql"
                        className="w-full bg-black/50 border border-white/15 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Deployment Note & Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={editDeploymentNote}
                        onChange={(e) => setEditDeploymentNote(e.target.value)}
                        placeholder="Enter deployment notes or rollback instructions..."
                        className="w-full bg-black/50 border border-white/15 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-y"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">Target Server & Path</span>
                        {currentTask.serverPath && (
                          <button
                            type="button"
                            onClick={() => copyText(currentTask.serverPath || '', 'serverPath')}
                            className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'serverPath' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedKey === 'serverPath' ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <span className="text-xs font-mono text-zinc-200 font-semibold block truncate">
                        {currentTask.serverPath || 'Server-1.42: /var/deploy'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        DevOps Notification Status
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">
                        {currentTask.sendDevOpsMail !== false ? 'Enabled (Mail triggered to DevOps)' : 'Disabled'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Items / Artifacts to Deploy
                      </span>
                      <span className="text-xs font-mono text-zinc-200 block whitespace-pre-wrap">
                        {currentTask.itemsToDeploy || 'Standard build packages / artifacts'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Deployment Note & Instructions
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {currentTask.deploymentNote || currentTask.remarks || 'Standard deployment for this change request.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-white/[0.06] space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Custom Remarks for Resend (Optional override)
                    </label>
                    <input
                      type="text"
                      value={customRemarks}
                      onChange={(e) => setCustomRemarks(e.target.value)}
                      placeholder="Add an optional deployment note..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={isSending || isResetting || isSavingDetails}
                      onClick={() => handleResendMail('DEVOPS_DEPLOYMENT', 'DevOps Deployment')}
                      className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-violet-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSending ? 'Sending...' : '✉ Resend DevOps Deployment Mail'}
                    </button>
                    <button
                      type="button"
                      disabled={isSending || isResetting || isSavingDetails}
                      onClick={() => handleResetThread('DEVOPS_DEPLOYMENT', 'DevOps Deployment')}
                      className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      title="Clears DevOps email thread references so the next email starts clean"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isResetting ? 'Resetting...' : '↻ Reset DevOps Thread'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 3: MAIL TO TESTING TEAM */}
            {selectedStream === 'testing' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Details Filled for Testing Team</h4>
                      <p className="text-xs text-zinc-400">
                        Information and unit testing results submitted for the QA / Testing team
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      flowType: UAT_TESTING
                    </span>
                    {!isEditingTesting ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTestingComments(currentTask.testingComments || currentTask.remarks || '');
                          setIsEditingTesting(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        Edit Details
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSavingDetails}
                          onClick={() => setIsEditingTesting(false)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingDetails}
                          onClick={() =>
                            handleSaveDetails(
                              { testingComments: editTestingComments.trim() },
                              'Testing details updated successfully.',
                              () => setIsEditingTesting(false)
                            )
                          }
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingDetails ? 'Saving...' : 'Save Details'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content View / Edit Mode */}
                {isEditingTesting ? (
                  <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.02] border border-emerald-500/20">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">
                          Unit Testing Document Attachment
                        </span>
                        {currentTask.unitTestDocName && (
                          <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[200px]">
                            {currentTask.unitTestDocName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleDocFileChange}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
                        />
                        <button
                          type="button"
                          disabled={isUploadingDoc || isSavingDetails}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {isUploadingDoc
                            ? 'Uploading...'
                            : currentTask.unitTestDocId
                            ? 'Replace Attached Document'
                            : 'Upload Unit Test Document'}
                        </button>
                        {currentTask.unitTestDocId && (
                          <button
                            type="button"
                            disabled={isSavingDetails}
                            onClick={() =>
                              handleSaveDetails(
                                { unitTestDocId: null, unitTestDocName: null },
                                'Document removed successfully.'
                              )
                            }
                            className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Remove attached document"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Testing Remarks & Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={editTestingComments}
                        onChange={(e) => setEditTestingComments(e.target.value)}
                        placeholder="Enter testing notes, verified test flows, or instructions..."
                        className="w-full bg-black/50 border border-white/15 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Assigned Tester
                      </span>
                      <span className="text-xs text-zinc-200 font-semibold">
                        {currentTask.tester?.fullName || 'QA Testing Team'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Deployment / Handoff Date
                      </span>
                      <span className="text-xs text-zinc-200 font-semibold">
                        {formatDate(currentTask.uatDate || currentTask.sitDate || currentTask.updatedDate)}
                      </span>
                    </div>

                    {/* Unit Testing Document Card */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">
                          Unit Testing Document
                        </span>
                        {currentTask.unitTestDocId && (
                          <button
                            type="button"
                            onClick={() => downloadDocument(currentTask.unitTestDocId!, currentTask.unitTestDocName || 'unit_test_document')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Attached Document
                          </button>
                        )}
                      </div>
                      {currentTask.unitTestDocId ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <FileTextIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono font-bold text-emerald-300 truncate">
                              {currentTask.unitTestDocName || 'unit_test_document.pdf'}
                            </p>
                            <p className="text-[10px] text-zinc-500">Attached during developer test handoff</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">No dedicated unit test document attached.</p>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Testing Remarks & Instructions
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {currentTask.testingComments || currentTask.remarks || 'Task verified and ready for testing.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-white/[0.06] space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Custom Remarks for Resend (Optional override)
                    </label>
                    <input
                      type="text"
                      value={customRemarks}
                      onChange={(e) => setCustomRemarks(e.target.value)}
                      placeholder="Add an optional note for the testing team..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={isSending || isResetting || isSavingDetails}
                      onClick={() => handleResendMail('UAT_TESTING', 'Testing Team Handoff')}
                      className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSending ? 'Sending...' : '✉ Resend Mail to Testing Team'}
                    </button>
                    <button
                      type="button"
                      disabled={isSending || isResetting || isSavingDetails}
                      onClick={() => handleResetThread('UAT_TESTING', 'Testing Team')}
                      className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      title="Clears testing email thread references so the next email starts clean"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isResetting ? 'Resetting...' : '↻ Reset Testing Thread'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SECTION 4: CODE REVIEW DONE / REVIEWER CONTROLS */}
            {selectedStream === 'reviewer_done' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Code Reviewer Controls
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    flowType: CODE_REVIEW
                  </span>
                </div>

                {/* If CR is currently in CODE_REVIEW status, give direct review action */}
                {currentTask.status === 'CODE_REVIEW' && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">⚠</span>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Pending Code Review Decision
                </span>
              </div>
              <p className="text-xs text-amber-300/80">
                This change request is currently awaiting review. Git Links: <span className="font-mono text-white">{currentTask.gitLinks || 'Not provided'}</span>
              </p>

              {isReviewer && (
                <div className="space-y-3 pt-1">
                  <textarea
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Enter review remarks (mandatory for approval or sending back)..."
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50 resize-none"
                  />

                  {reviewActionMsg && (
                    <p className={`text-xs font-medium ${reviewActionMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {reviewActionMsg.text}
                    </p>
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      disabled={reviewLoading || !reviewRemarks.trim()}
                      onClick={handleApproveCodeReview}
                      className="flex-1 py-2 px-3 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
                    >
                      {reviewLoading ? 'Processing...' : '✓ Approve Code Review'}
                    </button>
                    <button
                      type="button"
                      disabled={reviewLoading || !reviewRemarks.trim()}
                      onClick={handleRequestChanges}
                      className="flex-1 py-2 px-3 text-xs font-bold bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-40 text-rose-300 rounded-xl transition-colors cursor-pointer"
                    >
                      {reviewLoading ? 'Processing...' : '↩ Request Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Details Filled for Code Review Done */}
          {isStageReviewDoneOrLater(currentTask.status) ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Code Review Done Mail Details</h4>
                    <p className="text-xs text-zinc-400">
                      Review outcome dispatched to developer {currentTask.assignedDeveloper?.fullName ? `(${currentTask.assignedDeveloper.fullName})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {currentTask.status}
                  </span>
                  {!isEditingReviewerDone ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditReviewerDoneRemarks(currentTask.remarks || (currentTask as any).codeReviewComments || '');
                        setIsEditingReviewerDone(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                      Edit Details
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSavingDetails}
                        onClick={() => setIsEditingReviewerDone(false)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingDetails}
                        onClick={() =>
                          handleSaveDetails(
                            { remarks: editReviewerDoneRemarks.trim() },
                            'Reviewer remarks updated successfully.',
                            () => setIsEditingReviewerDone(false)
                          )
                        }
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSavingDetails ? 'Saving...' : 'Save Details'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content View / Edit Mode */}
              {isEditingReviewerDone ? (
                <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.02] border border-sky-500/20">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Reviewer Remarks & Approval Feedback
                    </label>
                    <textarea
                      rows={4}
                      value={editReviewerDoneRemarks}
                      onChange={(e) => setEditReviewerDoneRemarks(e.target.value)}
                      placeholder="Enter reviewer remarks or feedback for the developer..."
                      className="w-full bg-black/50 border border-white/15 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Code Reviewer / Approver
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold">
                      {currentTask.approver?.fullName || (currentTask as any).codeReviewer?.fullName || currentUser?.fullName || 'Code Reviewer'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Recipient Developer
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold truncate block">
                      {currentTask.assignedDeveloper?.fullName || 'Assigned Developer'}{' '}
                      {currentTask.assignedDeveloper?.email && (
                        <span className="text-zinc-500 font-mono">({currentTask.assignedDeveloper.email})</span>
                      )}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Review / Approval Date
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold">
                      {formatDate(currentTask.codeReviewDate || currentTask.updatedDate)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Branch Verified
                    </span>
                    <span className="text-xs font-mono text-zinc-200 font-semibold truncate block">
                      {currentTask.branchName || 'Not specified'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Reviewer Remarks & Approval Feedback
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {currentTask.remarks || (currentTask as any).codeReviewComments || 'Code review approved successfully.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-white/[0.06] space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                    Custom Remarks for Resend (Optional override)
                  </label>
                  <input
                    type="text"
                    value={customRemarks}
                    onChange={(e) => setCustomRemarks(e.target.value)}
                    placeholder="Add an optional note to include with the approval email..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={isSending || isResetting || isSavingDetails}
                    onClick={() => handleResendMail('CODE_REVIEW_APPROVAL', 'Code Review Approval')}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSending ? 'Sending...' : '✉ Resend Code Review Done Mail'}
                  </button>
                  <button
                    type="button"
                    disabled={isSending || isResetting || isSavingDetails}
                    onClick={() => handleResetThread('CODE_REVIEW', 'Code Review Approval')}
                    className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    title="Clears approval thread reference so the next email starts a clean thread"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {isResetting ? 'Resetting...' : '↻ Reset Mail Thread'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] text-xs text-zinc-400 flex items-center gap-2.5">
              <span className="text-base text-amber-400 shrink-0">ℹ</span>
              <span>Code review is currently in progress. Once approved, the Code Review Done email details and resend button will become active here.</span>
            </div>
          )}
        </div>
      )}

      {/* SUB-SECTION 5: UAT TESTING COMPLETED */}
      {selectedStream === 'uat_completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Tester Notification Controls
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              flowType: UAT_TESTING
            </span>
          </div>

          {!isStageInTestingOrLater(currentTask.status) ? (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <span className="text-amber-400">ℹ</span>
                <span>CR Has Not Reached Testing Stage</span>
              </div>
              <p className="leading-relaxed">
                Current CR status is <strong className="text-white px-2 py-0.5 rounded bg-white/10">{currentTask.status}</strong>. Testing notification controls and sign-off options will automatically activate once the CR is handed off to testing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">UAT Testing Completed Mail Details</h4>
                    <p className="text-xs text-zinc-400">
                      Sign-off email dispatched to developer and team upon test completion
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {currentTask.status}
                  </span>
                  {!isEditingTesterComplete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditTesterCompleteComments(currentTask.testingComments || currentTask.remarks || '');
                        setIsEditingTesterComplete(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      Edit Details
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSavingDetails}
                        onClick={() => setIsEditingTesterComplete(false)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingDetails}
                        onClick={() =>
                          handleSaveDetails(
                            { testingComments: editTesterCompleteComments.trim() },
                            'Tester comments updated successfully.',
                            () => setIsEditingTesterComplete(false)
                          )
                        }
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSavingDetails ? 'Saving...' : 'Save Details'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content View / Edit Mode */}
              {isEditingTesterComplete ? (
                <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.02] border border-emerald-500/20">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Tester Remarks & Sign-off Comments
                    </label>
                    <textarea
                      rows={4}
                      value={editTesterCompleteComments}
                      onChange={(e) => setEditTesterCompleteComments(e.target.value)}
                      placeholder="Enter tester remarks, sign-off notes, or validation summary..."
                      className="w-full bg-black/50 border border-white/15 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Tester Name
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold">
                      {currentTask.tester?.fullName || currentUser?.fullName || 'Assigned QA Tester'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Recipient Developer
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold truncate block">
                      {currentTask.assignedDeveloper?.fullName || 'Assigned Developer'}{' '}
                      {currentTask.assignedDeveloper?.email && (
                        <span className="text-zinc-500 font-mono">({currentTask.assignedDeveloper.email})</span>
                      )}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Completion Date
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold">
                      {formatDate(currentTask.uatCompletedDate || currentTask.testingCompletedDate || currentTask.updatedDate)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Testing Metrics
                    </span>
                    <span className="text-xs text-zinc-200 font-semibold">
                      {currentTask.totalBugsRaised ?? 0} bugs raised • {currentTask.totalRetests ?? 0} retests
                      {currentTask.testingDuration ? ` • ${currentTask.testingDuration}` : ''}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                      Tester Remarks & Sign-off Comments
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {currentTask.testingComments || currentTask.remarks || 'UAT testing completed successfully. All test cases verified.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-white/[0.06] space-y-3">
                {isStageUatCompletedOrLater(currentTask.status) ? (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Custom Remarks for Resend (Optional override)
                      </label>
                      <input
                        type="text"
                        value={customRemarks}
                        onChange={(e) => setCustomRemarks(e.target.value)}
                        placeholder="Add an optional note to include with the UAT complete email..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        disabled={isSending || isResetting || isSavingDetails}
                        onClick={() => handleResendMail('UAT_COMPLETED', 'UAT Testing Completed')}
                        className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSending ? 'Sending...' : '✉ Resend UAT Completed Mail'}
                      </button>
                      <button
                        type="button"
                        disabled={isSending || isResetting || isSavingDetails}
                        onClick={() => handleResetThread('UAT_TESTING', 'UAT Testing Complete')}
                        className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        title="Clears UAT testing email thread references so the next email starts clean"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isResetting ? 'Resetting...' : '↻ Reset Testing Thread'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <span className="shrink-0 text-base">ℹ</span>
                    <span>UAT Testing is currently in progress ({currentTask.status}). Sign-off completion email can be resent once testing is marked UAT Passed/Completed.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  </div>
);
}

export default CRDetailSlideOver;
