import { useState, useEffect } from "react";
import { fmtDate } from "@/utils/dateFormat";
import { motion } from "framer-motion";
import {
  Trophy,
  Award,
  Star,
  Shield,
  Zap,
  CheckCircle2,
  TrendingUp,
  Lock,
  Sparkles,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import {
  recognitionService,
  type RecognitionScore,
  type UserAchievement,
  type AchievementProgress,
  type AchievementCatalogueItem
} from "@/services/recognition.service";
import { useAuthStore } from "@/store/authStore";

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  COMMON: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30", glow: "shadow-slate-500/20" },
  UNCOMMON: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  RARE: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
  EPIC: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/30", glow: "shadow-purple-500/20" },
  LEGENDARY: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/20" }
};

export default function RecognitionPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.some(r => r.includes("DEVADMIN") || r.includes("TESTADMIN"));

  const [score, setScore] = useState<RecognitionScore | null>(null);
  const [unlocked, setUnlocked] = useState<UserAchievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress[]>([]);
  const [catalogue, setCatalogue] = useState<AchievementCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"unlocked" | "all" | "progress">("unlocked");
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState<string>("");
  const [grantCode, setGrantCode] = useState<string>("");
  const [grantReason, setGrantReason] = useState<string>("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [scoreRes, unlockedRes, progressRes, catalogueRes] = await Promise.all([
        recognitionService.getMyScore(),
        recognitionService.getMyAchievements(0, 100),
        recognitionService.getMyProgress(),
        recognitionService.getCatalogue(0, 100)
      ]);
      setScore(scoreRes);
      setUnlocked(unlockedRes.content || []);
      setProgress(progressRes || []);
      setCatalogue(catalogueRes.content || []);
    } catch (e) {
      console.error("Failed to load recognition data", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId || !grantCode || !grantReason) return;
    setGranting(true);
    try {
      const ok = await recognitionService.grantAdminAchievement(
        parseInt(grantUserId),
        grantCode,
        grantReason
      );
      if (ok) {
        setGrantModalOpen(false);
        setGrantUserId("");
        setGrantCode("");
        setGrantReason("");
        loadData();
      }
    } catch (err) {
      console.error("Grant failed", err);
    } finally {
      setGranting(false);
    }
  };

  const unlockedCodeSet = new Set(unlocked.map(u => u.achievement.code));

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Banner (Theme-Aware) ────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-primary shadow-sm">
                <Trophy className="h-6 w-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Achievements & Recognition
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-xl">
              Earn recognition points and badges as you ship quality CRs, complete sprints, and pass zero-rework code reviews.
            </p>
          </div>

          {/* Admin grant trigger button */}
          {isAdmin && (
            <button
              onClick={() => setGrantModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-lg hover:opacity-90 transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Grant Achievement</span>
            </button>
          )}
        </div>

        {/* Non-evaluative policy notice banner (Theme-aware high contrast compliance) */}
        <div className="mt-6 flex items-start md:items-center space-x-3 rounded-2xl bg-amber-500/15 dark:bg-amber-500/10 border border-amber-500/40 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-950 dark:text-amber-200 font-semibold shadow-sm">
          <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 md:mt-0" />
          <span>
            <strong className="text-amber-950 dark:text-amber-300 font-extrabold mr-1">Policy Notice:</strong>
            Recognition points and levels reflect gamified system activity and must NOT be used for formal performance evaluations, promotion, or compensation reviews.
          </span>
        </div>
      </div>

      {/* ── Score & Quality Stats Overview ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 backdrop-blur-xl shadow-lg"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Score</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
              <Star className="h-4 w-4 fill-current" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-foreground">{score?.totalScore ?? 0}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">pts</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Server-calculated total</p>
        </motion.div>

        {/* Current Level */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 backdrop-blur-xl shadow-lg"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Level</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-foreground">
              {score?.currentLevel?.title || "Level 1 (Novice)"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
            Tier {score?.currentLevel?.levelNumber || 1} Developer
          </p>
        </motion.div>

        {/* Quality Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 backdrop-blur-xl shadow-lg"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Composite Quality</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-foreground">
              {score?.qualityScore !== undefined ? Number(score.qualityScore).toFixed(1) : "100.0"}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Quality gates volume (§12)</p>
        </motion.div>

        {/* First Pass Approval */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 backdrop-blur-xl shadow-lg"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approval Rate</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-foreground">
              {score?.approvalRate !== undefined ? Number(score.approvalRate).toFixed(1) : "100.0"}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">First-pass code approval</p>
        </motion.div>
      </div>

      {/* ── Main Tab Navigation ───────────────────────────────────────── */}
      <div className="flex items-center space-x-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("unlocked")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "unlocked"
              ? "bg-primary text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Unlocked ({unlocked.length})
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "progress"
              ? "bg-primary text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          In Progress ({progress.length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-primary text-white shadow-lg"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          All Badges ({catalogue.length})
        </button>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 flex justify-center text-muted-foreground text-xs font-mono animate-pulse">
          Loading achievements...
        </div>
      ) : (
        <>
          {/* Unlocked Badges */}
          {activeTab === "unlocked" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlocked.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                  No achievements unlocked yet. Ship CRs and complete code reviews to earn your first badge!
                </div>
              ) : (
                unlocked.map(item => {
                  const style = RARITY_COLORS[item.achievement.rarity] || RARITY_COLORS.COMMON;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`relative overflow-hidden rounded-2xl border ${style.border} bg-card p-5 backdrop-blur-xl shadow-lg hover:border-primary/40 transition-all`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-2xl ${style.bg} ${style.text} border ${style.border}`}>
                            <Award className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground">{item.achievement.name}</h3>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${style.text}`}>
                              {item.achievement.rarity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>+{item.pointsAwarded}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        {item.achievement.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Unlocked {fmtDate(item.unlockDate)}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Achievement Progress */}
          {activeTab === "progress" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progress.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                  No active achievement progress tracked yet.
                </div>
              ) : (
                progress.map(item => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-5 backdrop-blur-xl space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{item.achievement.name}</h4>
                          <span className="text-[11px] text-muted-foreground">{item.achievement.description}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary">{Number(item.percentComplete).toFixed(0)}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                          style={{ width: `${Math.min(item.percentComplete, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{item.currentValue} / {item.targetValue}</span>
                        <span>{item.achievement.pointValue} pts reward</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* All Catalogue Badges */}
          {activeTab === "all" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogue.map(item => {
                const isUnlocked = unlockedCodeSet.has(item.code);
                const style = RARITY_COLORS[item.rarity] || RARITY_COLORS.COMMON;

                return (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-2xl border ${
                      isUnlocked ? style.border : "border-border"
                    } ${isUnlocked ? "bg-card" : "bg-card/40 opacity-70"} p-5 backdrop-blur-xl transition-all shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl ${isUnlocked ? style.bg : "bg-muted"} ${isUnlocked ? style.text : "text-muted-foreground"}`}>
                          {isUnlocked ? <Award className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${style.text}`}>
                            {item.rarity}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>+{item.pointValue}</span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                      {isUnlocked ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Unlocked</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center space-x-1">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Admin Grant Achievement Modal ───────────────────────────── */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <span>Grant Admin Achievement</span>
              </h3>
              <button
                onClick={() => setGrantModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  Target User ID
                </label>
                <input
                  type="number"
                  required
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  Achievement Code
                </label>
                <input
                  type="text"
                  required
                  value={grantCode}
                  onChange={e => setGrantCode(e.target.value)}
                  placeholder="e.g. MENTOR_LVL1"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  Verification Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={grantReason}
                  onChange={e => setGrantReason(e.target.value)}
                  placeholder="State the verification reason or certification details..."
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                >
                  {granting ? "Granting..." : "Confirm Grant"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
