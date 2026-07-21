import { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import APP_CONFIG from "@/config/appConfig"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, ShieldAlert, History, User, FileText, ArrowRight, ArrowLeft, Download, Folder, FolderOpen, Clock } from "lucide-react"
import { motion } from "framer-motion"

export default function Audits() {
  const { auditLogs, fetchData, tasks } = useTaskStore()
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  
  const [selectedEntity, setSelectedEntity] = useState<{ entityType: string; entityId: number; jtrackId: string } | null>(null);
  const [groupedLogs, setGroupedLogs] = useState<any[]>([]);
  const [timelineMode, setTimelineMode] = useState<'tree' | 'chrono'>('tree');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineActor, setTimelineActor] = useState('');
  const [timelineAction, setTimelineAction] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Created: true, Bug: true, Retest: true
  });

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedEntity) {
      const params = new URLSearchParams();
      if (timelineSearch) params.append('search', timelineSearch);
      if (timelineActor) params.append('actorId', timelineActor);
      if (timelineAction) params.append('actionType', timelineAction);

      fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/${selectedEntity.entityType}/${selectedEntity.entityId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(r => r.json())
        .then(setGroupedLogs)
        .catch(() => setGroupedLogs([]));
    }
  }, [selectedEntity, timelineSearch, timelineActor, timelineAction]);

  // Resolve target identifier (e.g. DT-101 or BUG-201)
  const getEntityJtrackId = (type: string, id: number) => {
    if (type === "TASK" || type === "BUG_TASK") {
      const task = tasks.find(t => t.id === id)
      return task ? task.jtrackId : `DT-${100 + id}`
    } else {
      const bug = useTaskStore.getState().bugs.find(b => b.id === id)
      return bug ? bug.jtrackId : `BUG-${200 + id}`
    }
  }

  // Group by entity and keep the latest record only
  const uniqueLogsMap = new Map<string, typeof auditLogs[0]>()
  const sortedLogs = [...auditLogs].sort((a, b) => new Date(a.changedDate).getTime() - new Date(b.changedDate).getTime())
  sortedLogs.forEach(log => {
    const key = `${log.entityType}_${log.entityId}`
    uniqueLogsMap.set(key, log)
  })
  const latestLogs = Array.from(uniqueLogsMap.values())

  const filteredLogs = latestLogs.filter(log => {
    const jtrackId = getEntityJtrackId(log.entityType, log.entityId)
    const matchesSearch = log.changedBy.fullName.toLowerCase().includes(search.toLowerCase()) ||
                          log.fieldName.toLowerCase().includes(search.toLowerCase()) ||
                          jtrackId.toLowerCase().includes(search.toLowerCase()) ||
                          (log.remarks && log.remarks.toLowerCase().includes(search.toLowerCase()))
    
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter
    return matchesSearch && matchesEntity
  })

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  }

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 120, damping: 14 }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-24 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Audit <span className="text-glow font-extrabold">Trails</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              Analyze all status transitions, rollback activities, and config edits to maintain security policy and timeline compliance.
            </p>
          </div>
        </div>
      </div>

      {selectedEntity ? (
        <GroupedAuditTimeline 
          entity={selectedEntity} 
          onBack={() => setSelectedEntity(null)}
          groupedLogs={groupedLogs}
          timelineMode={timelineMode}
          setTimelineMode={setTimelineMode}
          timelineSearch={timelineSearch}
          setTimelineSearch={setTimelineSearch}
          timelineActor={timelineActor}
          setTimelineActor={setTimelineActor}
          timelineAction={timelineAction}
          setTimelineAction={setTimelineAction}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
        />
      ) : (
        <>
          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.2)] text-xs backdrop-blur-md">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                placeholder="Search logs by auditor, ticket ID, fields, or remarks..."
                className="h-9 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl pl-10 pr-3 text-xs text-foreground focus:outline-none transition-all placeholder:text-muted-foreground/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Selection */}
            <div className="flex items-center space-x-2 text-muted-foreground font-semibold shrink-0 w-full sm:w-auto justify-end">
              <Filter className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-slate-300">Entity:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="h-9 bg-[#0c0f1d] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-1 outline-none text-foreground font-medium transition-all text-xs cursor-pointer"
              >
                <option value="all">All Logs</option>
                <option value="TASK">CR Tasks (TASK)</option>
                <option value="BUG">Bugs (BUG)</option>
                <option value="BUG_TASK">Tester Bug Tasks (BUG_TASK)</option>
              </select>
            </div>
          </div>

          {/* Audits Table */}
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01] text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Changed Date</th>
                      <th className="p-4">Ticket ID</th>
                      <th className="p-4">Auditor</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Field</th>
                      <th className="p-4">Old Value</th>
                      <th className="p-4">New Value</th>
                      <th className="p-4">Remarks / Reason</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-white/[0.04]"
                  >
                    {filteredLogs.length === 0 ? (
                      <tr className="hover:bg-transparent">
                        <td colSpan={8} className="p-12 text-center text-muted-foreground font-medium">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="p-3 rounded-full bg-white/[0.02] border border-white/[0.04] text-muted-foreground/60">
                              <ShieldAlert className="h-6 w-6 stroke-[1.5]" />
                            </div>
                            <p className="text-sm">No audit logs matching query.</p>
                            <p className="text-[11px] text-muted-foreground/60">Try adjusting your filters or search term.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      [...filteredLogs].reverse().map((log) => (
                        <motion.tr 
                          key={log.id} 
                          variants={rowVariants}
                          onClick={() => setSelectedEntity({
                            entityType: log.entityType,
                            entityId: log.entityId,
                            jtrackId: getEntityJtrackId(log.entityType, log.entityId)
                          })}
                          className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          {/* Date */}
                          <td className="p-4 text-muted-foreground font-mono">
                            {new Date(log.changedDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>

                          {/* Ticket ID */}
                          <td className="p-4">
                            <span className="font-mono font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2 py-0.5 rounded shadow-sm">
                              {getEntityJtrackId(log.entityType, log.entityId)}
                            </span>
                          </td>

                          {/* Auditor */}
                          <td className="p-4">
                            <div className="flex items-center space-x-1.5 font-semibold text-white">
                              <User className="h-3 w-3 text-cyan-400 shrink-0" />
                              <span>{log.changedBy.fullName}</span>
                            </div>
                          </td>

                          {/* Type Badge */}
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                              log.entityType === "TASK" 
                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20" 
                                : log.entityType === "BUG" 
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              {log.entityType}
                            </span>
                          </td>

                          {/* Field */}
                          <td className="p-4 font-bold text-slate-300">
                            {log.fieldName}
                          </td>

                          {/* Old Value */}
                          <td className="p-4">
                            <span className="text-rose-400 font-medium line-through decoration-rose-500/50 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                              {log.oldValue || "None"}
                            </span>
                          </td>

                          {/* New Value */}
                          <td className="p-4">
                            <div className="flex items-center space-x-1.5">
                              <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                              <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.03)]">
                                {log.newValue || "None"}
                              </span>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="p-4 text-muted-foreground/90 max-w-xs truncate font-medium" title={log.remarks}>
                            <div className="flex items-center space-x-1">
                              <FileText className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              <span className="truncate">{log.remarks || "NA"}</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </motion.tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function GroupedAuditTimeline({
  entity,
  onBack,
  groupedLogs,
  timelineMode,
  setTimelineMode,
  timelineSearch,
  setTimelineSearch,
  timelineActor,
  setTimelineActor,
  timelineAction,
  setTimelineAction,
  expandedGroups,
  setExpandedGroups
}: {
  entity: { entityType: string; entityId: number; jtrackId: string };
  onBack: () => void;
  groupedLogs: any[];
  timelineMode: 'tree' | 'chrono';
  setTimelineMode: (m: 'tree' | 'chrono') => void;
  timelineSearch: string;
  setTimelineSearch: (s: string) => void;
  timelineActor: string;
  setTimelineActor: (a: string) => void;
  timelineAction: string;
  setTimelineAction: (a: string) => void;
  expandedGroups: Record<string, boolean>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const allFlatLogs = groupedLogs.flatMap(g => g.logs || []);
  const uniqueActorsMap = new Map<number, string>();
  allFlatLogs.forEach((log: any) => {
    if (log.changedBy) {
      uniqueActorsMap.set(log.changedBy.id, log.changedBy.fullName);
    }
  });
  const uniqueActors = Array.from(uniqueActorsMap.entries());
  const uniqueActions = Array.from(new Set(allFlatLogs.map((log: any) => log.fieldName).filter(Boolean)));

  const { setDownloadTarget, addToast } = useTaskStore();

  const handleExport = () => {
    const params = new URLSearchParams();
    if (timelineSearch) params.append('search', timelineSearch);
    if (timelineActor) params.append('actorId', timelineActor);
    if (timelineAction) params.append('actionType', timelineAction);

    fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/${entity.entityType}/${entity.entityId}/export?${params.toString()}`, {
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
        setDownloadTarget({
          base64Data,
          defaultFileName: `audit_history_${entity.entityType}_${entity.entityId}.xlsx`
        });
      };
      reader.readAsDataURL(blob);
    })
    .catch(err => {
      addToast("Export failed: " + err.message, "error");
    });
  };

  const renderLogCard = (log: any) => (
    <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-md">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
        {log.changedBy?.fullName?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-200">
            {log.changedBy?.fullName ?? 'System'}
            <span className="font-normal text-zinc-400 ml-1.5">changed</span>
            <span className="font-mono text-xs text-violet-400 bg-violet-500/5 px-2 py-0.5 rounded ml-2 border border-violet-500/10">{log.fieldName}</span>
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">
            {new Date(log.changedDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-2.5 mt-2 text-xs">
          {log.oldValue && (
            <>
              <span className="text-rose-400 line-through bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">{log.oldValue}</span>
              <span className="text-zinc-600">→</span>
            </>
          )}
          <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{log.newValue}</span>
        </div>
        {log.remarks && (
          <p className="text-xs text-zinc-400 mt-3 bg-black/30 p-2.5 rounded-xl border border-white/[0.04] italic">
            "{log.remarks}"
          </p>
        )}
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      {/* Drill-down Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-white/[0.04] border border-white/[0.1] rounded-xl hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all animate-pulse"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2 py-0.5 rounded">
                {entity.jtrackId}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Grouped Timeline</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">Audit History & Trail</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Mode toggle */}
          <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setTimelineMode('tree')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${timelineMode === 'tree' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Folder className="h-3.5 w-3.5" /> Tree View
            </button>
            <button
              onClick={() => setTimelineMode('chrono')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${timelineMode === 'chrono' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Clock className="h-3.5 w-3.5" /> Chrono
            </button>
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search within history..."
            value={timelineSearch}
            onChange={(e) => setTimelineSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.1] focus:ring-1 focus:ring-violet-500/50 rounded-xl pl-9 pr-3 py-2 outline-none text-zinc-300 focus:border-violet-500"
          />
        </div>

        <select
          value={timelineActor}
          onChange={(e) => setTimelineActor(e.target.value)}
          className="w-full bg-[#0c0f1d] border border-white/[0.1] rounded-xl px-3 py-2 outline-none text-zinc-300 cursor-pointer"
        >
          <option value="">All Actors</option>
          {uniqueActors.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select
          value={timelineAction}
          onChange={(e) => setTimelineAction(e.target.value)}
          className="w-full bg-[#0c0f1d] border border-white/[0.1] rounded-xl px-3 py-2 outline-none text-zinc-300 cursor-pointer"
        >
          <option value="">All Fields / Action Types</option>
          {uniqueActions.map((act: any) => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
      </div>

      {/* Timeline rendering */}
      {timelineMode === 'chrono' ? (
        <div className="relative pl-6 border-l-2 border-white/[0.06] ml-4 space-y-6">
          {allFlatLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">No records matching filters.</div>
          ) : (
            allFlatLogs
              .sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime())
              .map((log: any) => (
                <div key={log.id} className="relative">
                  {/* Timeline point */}
                  <div className="absolute -left-[31px] top-5 w-3 h-3 rounded-full bg-violet-500 border-2 border-[#060814] shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                  {renderLogCard(log)}
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {groupedLogs.map((group) => {
            const isExpanded = !!expandedGroups[group.groupName];
            const logsCount = group.logs?.length ?? 0;
            if (logsCount === 0) return null;

            return (
              <div key={group.groupName} className="border border-white/[0.06] rounded-2xl bg-white/[0.01] overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.groupName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{isExpanded ? <FolderOpen className="h-4 w-4 text-violet-400" /> : <Folder className="h-4 w-4 text-zinc-500" />}</span>
                    <span className="text-sm font-bold text-zinc-200">{group.groupName}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 font-bold text-violet-400">
                      {logsCount}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 font-semibold">{isExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-white/[0.04] bg-black/20 space-y-4">
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
