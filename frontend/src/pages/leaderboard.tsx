import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Star,
  Shield,
  Zap,
  AlertCircle
} from "lucide-react";
import { recognitionService, type LeaderboardEntry } from "@/services/recognition.service";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"ALL_TIME" | "MONTHLY" | "QUARTERLY">("ALL_TIME");

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await recognitionService.getLeaderboard(0, 50, period);
      setEntries(res.content || []);
    } catch (e) {
      console.error("Failed to load leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  const topThree = entries.slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Banner Header (High contrast dark theme container) ───── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 dark:border-white/[0.1] bg-slate-900 text-white p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Trophy className="h-6 w-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Developer Leaderboard
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl font-medium">
              Relative recognition rankings based on total server-verified points and quality-gated metrics.
            </p>
          </div>

          {/* Period filter buttons */}
          <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-700/60 shrink-0">
            {(["ALL_TIME", "MONTHLY", "QUARTERLY"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  period === p
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {p.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Non-evaluative notice banner (Spec §4 compliance) */}
        <div className="mt-6 flex items-center space-x-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-200 font-medium">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-amber-300 font-bold">Policy Notice:</strong> Rankings are strictly non-evaluative gamification metrics. Raw score exports and rankings are prohibited from being used in HR reviews, performance appraisals, or compensation decisions.
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-muted-foreground text-xs font-mono animate-pulse">
          Loading leaderboard rankings...
        </div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-xs font-mono">
          No leaderboard data available yet. Start shipping CRs to populate rankings!
        </div>
      ) : (
        <>
          {/* ── Top 3 Podium Cards ──────────────────────────────────────── */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((item, idx) => {
                const ranks = [
                  { title: "1st Place", color: "from-amber-500/20 via-amber-600/10 to-transparent", border: "border-amber-500/40", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: Crown },
                  { title: "2nd Place", color: "from-slate-400/20 via-slate-500/10 to-transparent", border: "border-slate-400/40", text: "text-slate-300", badge: "bg-slate-400/20 text-slate-300 border-slate-400/40", icon: Medal },
                  { title: "3rd Place", color: "from-amber-700/20 via-orange-950/10 to-transparent", border: "border-amber-700/40", text: "text-amber-500", badge: "bg-amber-700/20 text-amber-400 border-amber-700/40", icon: Award }
                ];
                const rankInfo = ranks[idx] || ranks[2];
                const RankIcon = rankInfo.icon;

                return (
                  <motion.div
                    key={item.userId}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative overflow-hidden rounded-3xl border ${rankInfo.border} bg-card bg-gradient-to-b ${rankInfo.color} p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`p-3 rounded-2xl ${rankInfo.badge} border shadow-md`}>
                        <RankIcon className="h-6 w-6" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${rankInfo.badge}`}>
                        #{idx + 1} Rank
                      </span>
                    </div>

                    <div className="mt-4 space-y-1">
                      <h3 className="text-lg font-black text-foreground truncate">{item.fullName || item.username}</h3>
                      <p className="text-xs text-muted-foreground flex items-center space-x-1 font-medium">
                        <Shield className="h-3.5 w-3.5 text-purple-400" />
                        <span>{item.levelTitle || "Level 1 (Novice)"}</span>
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quality Score</span>
                        <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                          <Zap className="h-3 w-3" />
                          <span>{item.qualityScore !== undefined ? Number(item.qualityScore).toFixed(1) : "100.0"}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Score</span>
                        <div className={`text-xl font-black ${rankInfo.text} flex items-center space-x-1 justify-end`}>
                          <Star className="h-4 w-4 fill-current" />
                          <span>{item.totalScore}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── Ranked Table (Rank #4 and below) ───────────────────────── */}
          <div className="rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                Developer Roster Rankings
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">{entries.length} active developers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3.5">Rank</th>
                    <th className="px-6 py-3.5">Developer</th>
                    <th className="px-6 py-3.5">Level Tier</th>
                    <th className="px-6 py-3.5 text-right">Approval Rate</th>
                    <th className="px-6 py-3.5 text-right">Quality Score</th>
                    <th className="px-6 py-3.5 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {entries.map((item, idx) => (
                    <tr
                      key={item.userId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-muted-foreground">
                        #{idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-sm">{item.fullName || item.username}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">@{item.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-[11px]">
                          <Shield className="h-3 w-3" />
                          <span>{item.levelTitle || "Level 1"}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-blue-400 font-semibold">
                        {item.approvalRate !== undefined ? Number(item.approvalRate).toFixed(1) : "100.0"}%
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400 font-semibold">
                        {item.qualityScore !== undefined ? Number(item.qualityScore).toFixed(1) : "100.0"}%
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-amber-500 dark:text-amber-400 font-mono text-sm">
                        {item.totalScore} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
