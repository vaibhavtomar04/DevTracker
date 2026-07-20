/**
 * CRTimelinePopup — Event-based vertical timeline popup
 * Shows only stages that have actually been triggered/completed based on task data.
 * All visible at once — no slides. Supports light & dark themes.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { Task } from '../../services/mockData';

/* ─── Workflow stage definitions ───────────────────────────────────── */
interface StageDef {
  key: string;
  label: string;
  icon: string;
  dateField: (t: Task) => string | undefined;
  actorField: (t: Task) => string | undefined;
  description: string;
}

const STAGE_DEFS: StageDef[] = [
  {
    key: 'OPEN',
    label: 'CR Created',
    icon: '📋',
    description: 'Change Request was created and assigned',
    dateField: (t) => t.createdDate,
    actorField: (t) => t.createdBy?.fullName,
  },
  {
    key: 'IN_PROGRESS',
    label: 'Development Started',
    icon: '💻',
    description: 'Developer picked up the task and started coding',
    dateField: (t) => t.devStartDate,
    actorField: (t) => t.developers?.[0]?.developer?.fullName || t.assignedDeveloper?.fullName,
  },
  {
    key: 'SIT_DEPLOYED',
    label: 'SIT Deployed',
    icon: '🚀',
    description: 'Build deployed to SIT (System Integration Test) environment',
    dateField: (t) => t.sitDate,
    actorField: (t) => t.assignedDeveloper?.fullName || t.developers?.[0]?.developer?.fullName,
  },
  {
    key: 'SIT_TESTING',
    label: 'SIT Testing',
    icon: '🔍',
    description: 'Tester is actively testing the build in SIT',
    dateField: (t) => t.sitDate,
    actorField: (t) => t.tester?.fullName,
  },
  {
    key: 'SIT_COMPLETED',
    label: 'SIT Passed',
    icon: '✅',
    description: 'SIT testing completed and approved by tester',
    dateField: (t) => t.sitDate,
    actorField: (t) => t.tester?.fullName,
  },
  {
    key: 'CODE_REVIEW',
    label: 'Code Review',
    icon: '👀',
    description: 'Code submitted for peer review / lead review',
    dateField: (t) => t.sitDate ?? t.devStartDate,
    actorField: (t) => t.createdBy?.fullName,
  },
  {
    key: 'CODE_REVIEW_DONE',
    label: 'Review Approved',
    icon: '✓',
    description: 'Code review passed, cleared for UAT',
    dateField: (t) => t.sitDate ?? t.devStartDate,
    actorField: (t) => t.createdBy?.fullName,
  },
  {
    key: 'MOVE_TO_UAT',
    label: 'UAT Deployed',
    icon: '🚀',
    description: 'Build deployed to UAT (User Acceptance Test) environment',
    dateField: (t) => t.uatDate,
    actorField: (t) => t.assignedDeveloper?.fullName,
  },
  {
    key: 'UAT_TESTING',
    label: 'UAT Testing',
    icon: '🔍',
    description: 'UAT testing in progress by QA / business users',
    dateField: (t) => t.uatDate,
    actorField: (t) => t.tester?.fullName,
  },
  {
    key: 'UAT_COMPLETED',
    label: 'UAT Passed',
    icon: '✅',
    description: 'UAT sign-off received, cleared for production',
    dateField: (t) => t.uatDate,
    actorField: (t) => t.tester?.fullName,
  },
  {
    key: 'PROD_DEPLOYED',
    label: 'Production Deployed',
    icon: '🚀',
    description: 'Deployed to production environment',
    dateField: (t) => t.productionDate,
    actorField: (t) => t.assignedDeveloper?.fullName,
  },
  {
    key: 'PROD_COMPLETED',
    label: 'Production Live',
    icon: '🎉',
    description: 'Verified live in production',
    dateField: (t) => t.productionDate,
    actorField: (t) => t.tester?.fullName,
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    icon: '🔒',
    description: 'CR fully closed and archived',
    dateField: (t) => t.productionDate ?? t.uatDate,
    actorField: (t) => t.createdBy?.fullName,
  },
];

const getExpectedDateForStage = (key: string, t: Task): string | undefined => {
  if (key === 'SIT_DEPLOYED') return t.expectedSitDeploymentDate;
  if (key === 'MOVE_TO_UAT') return t.expectedUatDeploymentDate;
  return undefined;
};

const STATUS_ORDER = STAGE_DEFS.map((s) => s.key);

function normalizeStatus(status: string): string {
  const s = status.toUpperCase();
  if (s === 'CHANGES_REQUESTED') return 'IN_PROGRESS';
  if (s === 'TESTING_COMPLETED') return 'UAT_COMPLETED';
  return s;
}

/**
 * Returns only the stages that have been reached (completed or active)
 * based on the task's current status in the workflow.
 */
function getReachedStages(task: Task): Array<{
  def: StageDef;
  status: 'completed' | 'active' | 'upcoming';
  date?: string;
  actor?: string;
}> {
  const normalized = normalizeStatus(task.status);
  const currentIdx = STATUS_ORDER.indexOf(normalized);
  const reached: Array<{ def: StageDef; status: 'completed' | 'active' | 'upcoming'; date?: string; actor?: string }> = [];

  STAGE_DEFS.forEach((def) => {
    const idx = STATUS_ORDER.indexOf(def.key);
    if (idx === -1) return;

    // Only include stages that have been reached (up to and including current)
    if (idx > currentIdx) return;

    const dateRaw = def.dateField(task);
    const actor = def.actorField(task);
    const isActive = def.key === normalized;

    reached.push({
      def,
      status: isActive ? 'active' : 'completed',
      date: dateRaw,
      actor: actor || undefined,
    });
  });

  return reached;
}

interface CRTimelinePopupProps {
  task: Task;
  onClose: () => void;
}

/* ─── Stage color tokens ─────────────────────────────────────── */
const STAGE_COLORS: Record<string, { ring: string; dot: string; bg: string; text: string; badge: string }> = {
  completed: {
    ring: 'ring-emerald-500/40',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  active: {
    ring: 'ring-sky-500/60',
    dot: 'bg-sky-500',
    bg: 'bg-sky-500/10 dark:bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  },
};

export const CRTimelinePopup: React.FC<CRTimelinePopupProps> = ({ task, onClose }) => {
  const reachedStages = getReachedStages(task);
  const normalized = normalizeStatus(task.status);
  const currentIdx = STATUS_ORDER.indexOf(normalized);
  const totalStages = currentIdx >= 0 ? currentIdx + 1 : 1;
  const completedCount = reachedStages.filter((s) => s.status === 'completed').length;
  const progressPct = Math.round((totalStages / STATUS_ORDER.length) * 100);

  // Keyboard close
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-md">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 18 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative w-full max-w-xl z-10 flex flex-col max-h-[90vh]"
      >
        {/* Card */}
        <div className="bg-white dark:bg-[#080c18] border border-slate-200 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl flex flex-col">

          {/* ── Header ── */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-start justify-between gap-4 flex-shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 text-base">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/10 px-2 py-0.5 rounded-lg border border-violet-200 dark:border-violet-500/20">
                    {task.jtrackId}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    task.priority === 'High'
                      ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                      : task.priority === 'Medium'
                      ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-600/30'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <h2 className="font-black text-sm text-slate-900 dark:text-zinc-100 truncate max-w-[300px] mt-1 leading-tight">
                  {task.title}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                  CR Workflow Timeline · {task.type?.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Progress bar ── */}
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="font-bold text-slate-600 dark:text-zinc-400">
                {completedCount} completed · 1 active
              </span>
              <span className="font-bold text-slate-600 dark:text-zinc-400">{progressPct}% through workflow</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* ── Timeline items (scrollable) ── */}
          <div className="overflow-y-auto flex-1 px-5 pb-5 pt-2 space-y-0">
            {reachedStages.map((entry, idx) => {
              const isLast = idx === reachedStages.length - 1;
              const colors = STAGE_COLORS[entry.status];

              return (
                <div key={entry.def.key} className="flex gap-4">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center">
                    {/* Dot */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ring-2 ${colors.ring} ${colors.bg} mt-2`}
                    >
                      {entry.status === 'completed' ? (
                        <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />
                      ) : (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.8 }}
                        >
                          <Clock className={`h-4 w-4 ${colors.text}`} />
                        </motion.div>
                      )}
                    </motion.div>
                    {/* Connector line */}
                    {!isLast && (
                      <div className="w-px flex-1 bg-slate-200 dark:bg-white/[0.07] mt-1 mb-1 min-h-[16px]" />
                    )}
                  </div>

                  {/* Content card */}
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 + 0.05, duration: 0.3 }}
                    className={`flex-1 mb-2 rounded-2xl border p-3.5 ${
                      entry.status === 'active'
                        ? 'bg-sky-50 dark:bg-sky-500/[0.06] border-sky-200 dark:border-sky-500/25 shadow-sm shadow-sky-500/10'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{entry.def.icon}</span>
                        <div>
                          <p className={`text-xs font-bold ${
                            entry.status === 'active'
                              ? 'text-sky-700 dark:text-sky-300'
                              : 'text-slate-800 dark:text-zinc-200'
                          }`}>
                            {entry.def.label}
                          </p>
                          <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-mono mt-0.5">
                            {entry.def.key}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${colors.badge}`}>
                        {entry.status === 'active' ? (
                          <span className="flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> Active</span>
                        ) : (
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Done</span>
                        )}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 mb-2 leading-relaxed">
                      {entry.def.description}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {entry.date && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400">
                          <span className="text-slate-400 dark:text-zinc-600">🕐</span>
                          <span className="font-semibold">
                            {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      {entry.actor && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-zinc-400">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                            {entry.actor.charAt(0)}
                          </div>
                          <span className="font-semibold">{entry.actor}</span>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const expectedDate = getExpectedDateForStage(entry.def.key, task);
                      if (!expectedDate) return null;

                      const actualDate = entry.date;
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isMissed = !actualDate && todayStr > expectedDate;
                      const isDelayed = actualDate && actualDate > expectedDate;
                      
                      let delayDays = 0;
                      if (isDelayed && actualDate) {
                        delayDays = Math.ceil((new Date(actualDate).getTime() - new Date(expectedDate).getTime()) / (1000 * 60 * 60 * 24));
                      } else if (isMissed) {
                        delayDays = Math.ceil((new Date().getTime() - new Date(expectedDate).getTime()) / (1000 * 60 * 60 * 24));
                      }

                      return (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-black/20 border border-white/[0.04] text-[10px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 font-bold tracking-wide">COMMITMENT</span>
                            {isDelayed && (
                              <span className="text-rose-400 font-extrabold flex items-center gap-0.5">🚨 Delayed by {delayDays}d</span>
                            )}
                            {isMissed && (
                              <span className="text-rose-400 font-extrabold flex items-center gap-0.5">🚨 Missed by {delayDays}d</span>
                            )}
                            {!isDelayed && !isMissed && actualDate && (
                              <span className="text-emerald-400 font-extrabold">✅ Met SLA</span>
                            )}
                            {!isDelayed && !isMissed && !actualDate && (
                              <span className="text-sky-400 font-extrabold">🕒 On Track</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[9px] text-zinc-400">
                            <div>Expected: <span className="font-semibold text-zinc-300">
                              {new Date(expectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span></div>
                            <div>Actual: <span className="font-semibold text-zinc-300">
                              {actualDate ? new Date(actualDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span></div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Developer list for dev stages */}
                    {(entry.def.key === 'IN_PROGRESS' || entry.def.key === 'CODE_REVIEW') &&
                      task.developers && task.developers.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.05]">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-wider mb-1.5">
                          All Developers
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {task.developers.map((d, di) => (
                            <div key={di} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-[9px] font-semibold text-slate-700 dark:text-zinc-300">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[7px] font-bold text-white">
                                {d.developer.fullName.charAt(0)}
                              </div>
                              {d.developer.fullName}
                              {d.progress !== undefined && (
                                <span className="text-slate-400 dark:text-zinc-500 ml-0.5">{d.progress}%</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              );
            })}

            {/* Current status marker at bottom */}
            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 bg-slate-100 dark:bg-white/[0.03] px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/[0.05]">
                Current: {task.status.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-white/[0.01]">
            <p className="text-[10px] text-slate-400 dark:text-zinc-600">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/[0.06] border border-slate-300 dark:border-white/10 font-mono text-[9px]">Esc</kbd> to close
            </p>
            <button
              onClick={onClose}
              className="text-xs font-bold px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] text-slate-700 dark:text-zinc-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CRTimelinePopup;
