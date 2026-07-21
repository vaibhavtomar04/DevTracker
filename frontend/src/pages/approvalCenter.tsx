/**
 * ApprovalCenter — central hub for managing pending approvals across Code Reviews, SIT, and UAT.
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { CRDetailSlideOver } from '@/components/shared/CRDetailSlideOver';
import { APP_CONFIG } from '@/config/appConfig';
import { type Task } from '@/services/mockData';

type ApprovalTab = 'CODE_REVIEW' | 'SIT_TESTING' | 'UAT_TESTING';

export default function ApprovalCenter() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('CODE_REVIEW');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/tasks?page=0&size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const content: Task[] = data.content ?? data;
        setTasks(content);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'CODE_REVIEW') return t.status === 'CODE_REVIEW';
    if (activeTab === 'SIT_TESTING') return t.status === 'SIT_TESTING' || t.status === 'SIT_DEPLOYED';
    if (activeTab === 'UAT_TESTING') return t.status === 'UAT_TESTING' || t.status === 'MOVE_TO_UAT';
    return false;
  });

  const handleApprove = async (task: Task) => {
    const remarks = remarksMap[task.id] || 'Approved';
    setSubmittingId(task.id);
    try {
      const token = localStorage.getItem('token');
      let endpoint = `${APP_CONFIG.apiUrl}/api/tasks/${task.id}/approve`;
      if (activeTab === 'SIT_TESTING') endpoint = `${APP_CONFIG.apiUrl}/api/tasks/${task.id}/approve-sit`;
      else if (activeTab === 'UAT_TESTING') endpoint = `${APP_CONFIG.apiUrl}/api/tasks/${task.id}/approve-uat`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks }),
      });

      if (res.ok) {
        fetchPending();
      }
    } catch { /* silent */ }
    finally { setSubmittingId(null); }
  };

  const handleReject = async (task: Task) => {
    const remarks = remarksMap[task.id];
    if (!remarks?.trim()) {
      alert('Remarks are required for rejection.');
      return;
    }
    setSubmittingId(task.id);
    try {
      const token = localStorage.getItem('token');
      let endpoint = `${APP_CONFIG.apiUrl}/api/tasks/${task.id}/reject`;
      if (activeTab === 'SIT_TESTING') endpoint = `${APP_CONFIG.apiUrl}/api/tasks/${task.id}/reject-sit`;
      else if (activeTab === 'UAT_TESTING') endpoint = `${APP_CONFIG.apiUrl}/api/tasks/${task.id}/reject-uat`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks }),
      });

      if (res.ok) {
        fetchPending();
      }
    } catch { /* silent */ }
    finally { setSubmittingId(null); }
  };

  const codeReviewCount = tasks.filter((t) => t.status === 'CODE_REVIEW').length;
  const sitCount = tasks.filter((t) => t.status === 'SIT_TESTING' || t.status === 'SIT_DEPLOYED').length;
  const uatCount = tasks.filter((t) => t.status === 'UAT_TESTING' || t.status === 'MOVE_TO_UAT').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xl">
            ✅
          </span>
          Approval Center
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review and approve pending change requests across code review, SIT, and UAT stages.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab('CODE_REVIEW')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'CODE_REVIEW'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
        >
          <span>💻 Code Reviews</span>
          {codeReviewCount > 0 && (
            <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {codeReviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SIT_TESTING')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'SIT_TESTING'
              ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
        >
          <span>🧪 SIT Approvals</span>
          {sitCount > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {sitCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('UAT_TESTING')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'UAT_TESTING'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
        >
          <span>🚀 UAT Sign-offs</span>
          {uatCount > 0 && (
            <span className="bg-emerald-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {uatCount}
            </span>
          )}
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <SkeletonLoader variant="card" count={4} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="No pending approvals"
          description={`There are currently no items awaiting ${activeTab.replace('_', ' ')} approval.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.03] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                      {task.jtrackId}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium">
                      {task.priority} Priority
                    </span>
                  </div>
                  <h3
                    onClick={() => setSelectedTask(task)}
                    className="text-base font-semibold text-zinc-100 hover:text-sky-400 cursor-pointer transition-colors line-clamp-1"
                  >
                    {task.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">{task.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Dev: <strong className="text-zinc-300">{task.assignedDeveloper?.fullName || 'Unassigned'}</strong></span>
                    <span>Branch: <strong className="font-mono text-zinc-400">{task.branchName || 'main'}</strong></span>
                  </div>

                  <input
                    type="text"
                    placeholder="Mandatory remarks for action..."
                    value={remarksMap[task.id] || ''}
                    onChange={(e) => setRemarksMap({ ...remarksMap, [task.id]: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(task)}
                      disabled={submittingId === task.id}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all"
                    >
                      {submittingId === task.id ? '...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(task)}
                      disabled={submittingId === task.id}
                      className="flex-1 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-50 text-rose-400 text-xs font-semibold transition-all"
                    >
                      {submittingId === task.id ? '...' : '✕ Send Back'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Slide Over */}
      {selectedTask && (
        <CRDetailSlideOver
          crId={selectedTask.id}
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={fetchPending}
          currentUser={user}
        />
      )}
    </div>
  );
}
