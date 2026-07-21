import React, { useState, useEffect } from "react";
import { X, Upload, Users, FileText, CheckCircle2, Sparkles, Code2, Layers, Cpu, Clock, Trash2, Calendar } from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useSprintStore } from "@/store/sprintStore";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/utils/apiClient";
import { uploadDocument } from "@/services/document.service";
import { useNavigate } from "react-router-dom";

interface CreateCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateCRModal: React.FC<CreateCRModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { fetchData, addToast, sprintTasks, fetchSprintTasks, tasks } = useTaskStore();
  const { sprints, fetchSprints } = useSprintStore();
  const { user } = useAuthStore();

  const [crType, setCrType] = useState("CR");
  const [sprintId, setSprintId] = useState<number | "">("");
  const [jtrackId, setJtrackId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [efforts, setEfforts] = useState<number | "">(3);
  const [branchName, setBranchName] = useState("");
  const branchCreationDate = new Date().toISOString().split("T")[0];
  const [selectedDeveloperIds, setSelectedDeveloperIds] = useState<number[]>([]);
  const [selectedSprintTaskIds, setSelectedSprintTaskIds] = useState<number[]>([]);
  const [brdFile, setBrdFile] = useState<File | null>(null);
  const [module, setModule] = useState("Core");
  const [expectedSitDeploymentDate, setExpectedSitDeploymentDate] = useState("");
  const [expectedUatDeploymentDate, setExpectedUatDeploymentDate] = useState("");

  const [availableDevelopers, setAvailableDevelopers] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Always generate a fresh unique numeric ID on open
      // Find the highest numeric suffix across all existing tasks (e.g. "CR-18" → 18)
      const maxNum = tasks.reduce((max: number, t: any) => {
        const n = parseInt((t.jtrackId || "").replace(/^[^\d]*/, ""), 10)
        return isNaN(n) ? max : Math.max(max, n)
      }, 0)
      setJtrackId(String(maxNum + 1))
      fetchSprints();
      fetchSprintTasks();
      loadFormData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && sprints.length > 0) {
      const activeSprint = sprints.find(s => s.status === "ACTIVE");
      if (activeSprint) {
        setSprintId(activeSprint.id);
      } else {
        setSprintId(sprints[0].id);
      }
    }
  }, [isOpen, sprints]);

  const loadFormData = async () => {
    try {
      const [usersRes, wfRes] = await Promise.all([
        apiClient("/api/users"),
        apiClient("/api/workflows").catch(() => [])
      ]);

      const devs = (usersRes || []).filter((u: any) => 
        u.roles?.includes("DEVELOPER") || u.roles?.includes("ROLE_DEVELOPER")
      );
      setAvailableDevelopers(devs);
      if (devs.length > 0 && selectedDeveloperIds.length === 0) {
        const currentDev = devs.find((d: any) => d.id === user?.id || d.username === user?.username);
        if (currentDev) {
          setSelectedDeveloperIds([currentDev.id]);
        } else {
          setSelectedDeveloperIds([devs[0].id]);
        }
      }

      if (wfRes && wfRes.length > 0) {
        setSelectedWorkflowId(wfRes[0].id);
      }
    } catch (err) {
      console.error("Failed to load form lookup data", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrdFile(file);
  };

  const toggleDeveloperSelection = (devId: number) => {
    setSelectedDeveloperIds(prev => 
      prev.includes(devId) ? prev.filter(id => id !== devId) : [...prev, devId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !jtrackId.trim()) {
      addToast("CR Title, Description, and CR ID are mandatory.", "error");
      return;
    }

    if (!expectedSitDeploymentDate || !expectedUatDeploymentDate) {
      addToast("Expected SIT and UAT deployment dates are mandatory.", "error");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (expectedSitDeploymentDate <= todayStr) {
      addToast("Expected SIT Deployment Date must be a future date.", "error");
      return;
    }
    if (expectedUatDeploymentDate <= todayStr) {
      addToast("Expected UAT Deployment Date must be a future date.", "error");
      return;
    }
    if (expectedUatDeploymentDate < expectedSitDeploymentDate) {
      addToast("Expected UAT Deployment Date cannot be before Expected SIT Deployment Date.", "error");
      return;
    }

    const prefix = crType === "CR" ? "CR-" :
                   crType === "Enhancement" ? "Enc-" :
                   crType === "Bug Fix" ? "Fix-" :
                   crType === "SR" ? "SR-" : "CR-";

    const cleanId = jtrackId.replace(/^(CR-|Enc-|Fix-|SR-|CR|Enc|Fix|SR)/i, "").trim();
    const finalJtrackId = `${prefix}${cleanId}`;

    setIsSubmitting(true);
    try {
      const primaryDev = availableDevelopers.find(d => selectedDeveloperIds.includes(d.id)) || null;

      const typeMapping: Record<string, { id: number; name: string; description: string }> = {
        CR: { id: 1, name: "CR", description: "Change Request" },
        SR: { id: 2, name: "SR", description: "Service Request" },
        "Bug Fix": { id: 3, name: "FIX", description: "Bug Fix" },
        Enhancement: { id: 4, name: "NEW_REQ", description: "New Requirement" }
      };
      const selectedTypeObj = typeMapping[crType] || typeMapping["CR"];

      const payload = {
        jtrackId: finalJtrackId,
        title: `[${crType}] ${title}`,
        description,
        type: selectedTypeObj,
        sprintId: sprintId !== "" ? Number(sprintId) : null,
        priority,
        efforts: efforts !== "" ? Number(efforts) : 1,
        branchName: branchName || `feature/${finalJtrackId.toLowerCase()}`,
        branchCreationDate,
        expectedSitDeploymentDate,
        expectedUatDeploymentDate,
        brdDocumentId: null,
        status: "CREATED",
        assignedDeveloper: primaryDev,
        workflow: selectedWorkflowId ? { id: selectedWorkflowId } : null,
        developers: selectedDeveloperIds.map(id => ({ developer: { id } })),
        sprintTasks: selectedSprintTaskIds.map(id => ({ id })),
        module: module.trim() || "Core"
      };

      // 1. Create task
      const savedTask = await apiClient("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // 2. Upload BRD file using dedicated XHR uploader (handles multipart boundary correctly)
      if (brdFile && savedTask && savedTask.id) {
        try {
          const docRes = await uploadDocument(savedTask.id, "BRD", brdFile);

          // 3. Link document ID to task entity
          if (docRes && docRes.id) {
            await apiClient(`/api/tasks/${savedTask.id}`, {
              method: "PUT",
              body: JSON.stringify({
                ...savedTask,
                brdDocumentId: docRes.id,
                remarks: "Attaching BRD document"
              })
            });
          }
        } catch (uploadErr: any) {
          console.error("Failed to upload BRD document post-creation:", uploadErr);
          addToast(uploadErr?.message || "CR created, but failed to upload BRD document.", "error");
        }
      }

      onClose();
      addToast(`CR ${finalJtrackId} got created successfully.`, "success");
      if (onSuccess) onSuccess();
      fetchData();
      navigate("/dashboard");
    } catch (err: any) {
      addToast(err.message || "Failed to create Change Request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto animate-fadeIn">
      {/* Radiant Glass Card Container */}
      <div className="relative bg-slate-950/85 border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_0_80px_rgba(139,92,246,0.25)] overflow-hidden text-slate-100 backdrop-blur-2xl transition-all">
        
        {/* Ambient Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 animate-pulse" />

        {/* Modal Header */}
        <div className="px-7 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30 text-violet-300 shadow-inner">
              <Sparkles className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-violet-200 tracking-tight">
                Create Change Request
              </h2>
              <p className="text-xs text-slate-400">Enterprise CR provisioning with workflow & multi-developer allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-7 space-y-6 scrollbar-thin scrollbar-thumb-white/10">


          {/* Row 1: CR Type, CR ID, Sprint */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-violet-400" /> CR Type
              </label>
              <select
                value={crType}
                onChange={(e) => setCrType(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all cursor-pointer shadow-inner"
              >
                <option value="CR" className="bg-slate-900 text-slate-100">CR (Change Request)</option>
                <option value="Enhancement" className="bg-slate-900 text-slate-100">Enhancement</option>
                <option value="Bug Fix" className="bg-slate-900 text-slate-100">Bug Fix</option>
                <option value="SR" className="bg-slate-900 text-slate-100">SR (Service Request)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" /> CR ID
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-mono text-xs text-slate-400 select-none">
                  {crType === "CR" ? "CR-" :
                   crType === "Enhancement" ? "Enc-" :
                   crType === "Bug Fix" ? "Fix-" :
                   crType === "SR" ? "SR-" : "CR-"}
                </span>
                <input
                  type="text"
                  value={jtrackId.replace(/^(CR-|Enc-|Fix-|SR-|CR|Enc|Fix|SR)/i, "")}
                  onChange={(e) => setJtrackId(e.target.value)}
                  placeholder="e.g. 8512"
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-14 pr-4 py-2.5 text-xs text-slate-100 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all font-mono shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" /> Target Sprint
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all cursor-pointer shadow-inner"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Target Sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                    {s.name} ({s.status.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CR Title */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              CR Title / Summary
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Provide a concise summary of the requested change..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all font-medium shadow-inner"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              Detailed Description & Scope
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Enter comprehensive business details, technical requirements, and acceptance criteria..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl p-4 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all resize-none leading-relaxed shadow-inner"
              required
            />
          </div>

          {/* Row 2: Priority, Effort & Module */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all cursor-pointer shadow-inner"
              >
                <option value="HIGH" className="bg-slate-900 text-rose-300">High Priority</option>
                <option value="MEDIUM" className="bg-slate-900 text-amber-300">Medium Priority</option>
                <option value="LOW" className="bg-slate-900 text-emerald-300">Low Priority</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Estimated Effort (Days)</label>
              <input
                type="number"
                step="0.5"
                value={efforts}
                onChange={(e) => setEfforts(e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-violet-400" /> Module
              </label>
              <input
                type="text"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder="e.g. Core, Billing"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all shadow-inner"
                required
              />
            </div>
          </div>

          {/* Row 2.5: Expected SIT & UAT Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-400" /> Expected SIT Deployment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expectedSitDeploymentDate}
                  onChange={(e) => setExpectedSitDeploymentDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="hide-calendar-picker w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 pr-10 text-xs text-slate-100 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all shadow-inner [color-scheme:dark] cursor-pointer"
                  required
                />
                <Calendar className="h-4 w-4 text-violet-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-400" /> Expected UAT Deployment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expectedUatDeploymentDate}
                  onChange={(e) => setExpectedUatDeploymentDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="hide-calendar-picker w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 pr-10 text-xs text-slate-100 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all shadow-inner [color-scheme:dark] cursor-pointer"
                  required
                />
                <Calendar className="h-4 w-4 text-violet-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 3: Git Branch Info */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-violet-400" /> Git Branch Name
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder={`feature/${jtrackId.toLowerCase()}`}
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition-all font-mono shadow-inner"
            />
          </div>

          {/* Multi-developer Allocation Glass Box */}
          <div className="space-y-2.5 pt-2">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-400" /> Assign Engineering Owners
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
              {availableDevelopers.map((dev) => {
                const isSelected = selectedDeveloperIds.includes(dev.id);
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => toggleDeveloperSelection(dev.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left border ${
                      isSelected 
                        ? "bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border-violet-500/50 text-white shadow-md shadow-violet-950/30"
                        : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 hover:border-white/10"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      isSelected ? "bg-violet-500 border-violet-400 text-white" : "border-slate-700 bg-slate-900"
                    }`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{dev.fullName || dev.username}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked Sprint Tasks Glass Box */}
          <div className="space-y-2.5 pt-2">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Cpu className="h-4 w-4 text-violet-400" /> Link Sprint Tasks
            </label>
            {sprintTasks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-center text-xs text-slate-500">
                No Sprint Tasks available in the system.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md max-h-48 overflow-y-auto scrollbar-thin">
                {sprintTasks.map((st) => {
                  const isSelected = selectedSprintTaskIds.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedSprintTaskIds(prev =>
                          prev.includes(st.id) ? prev.filter(id => id !== st.id) : [...prev, st.id]
                        );
                      }}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left border ${
                        isSelected
                          ? "bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border-violet-500/50 text-white shadow-md shadow-violet-950/30"
                          : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 hover:border-white/10"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isSelected ? "bg-violet-500 border-violet-400 text-white" : "border-slate-700 bg-slate-900"
                      }`}>
                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="truncate">
                        <span className="font-mono text-[9px] text-sky-400 block">{st.taskCode}</span>
                        <span className="truncate block font-medium">{st.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* BRD Attachment Box */}
          <div className="space-y-2.5 pt-2">
            <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" /> Business Requirement Document (BRD)
            </label>
            <div>
              <label className="w-full border border-dashed border-white/[0.12] rounded-xl p-4 flex flex-col items-center gap-2 hover:border-violet-500/40 hover:bg-violet-500/[0.03] transition-all text-slate-500 hover:text-slate-300 cursor-pointer">
                <Upload className="h-5 w-5" />
                <span className="text-[11px]">Click to attach files</span>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" accept="*" />
              </label>
              {brdFile ? (
                <div className="mt-2 flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  {brdFile.type.startsWith("image/") ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                      <img src={URL.createObjectURL(brdFile)} alt={brdFile.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-lg shrink-0">
                      📄
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <span className="block truncate font-mono text-slate-200 text-[11px]">{brdFile.name}</span>
                    <span className="text-[9px] text-slate-500">{(brdFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBrdFile(null)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500 italic">No file selected (Optional)</p>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-5 border-t border-white/10 flex items-center justify-end gap-3.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Creating CR..." : "Submit Change Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
