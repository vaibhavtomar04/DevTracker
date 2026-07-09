import React, { useState, useRef } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface QualityRiskBadgeProps {
  taskId: number;
  isQualityRisk: boolean;
}

interface RiskBreakdown {
  crId: number;
  crNumber: string;
  crTitle: string;
  isQualityRisk: boolean;
  bugCount: number;
  thresholdBugs: number;
  bugThresholdExceeded: boolean;
  retestCount: number;
  thresholdRetests: number;
  retestThresholdExceeded: boolean;
  rejectedBugCount: number;
  thresholdRejectedBugs: number;
  rejectedBugsThresholdExceeded: boolean;
  challengeRate: number;
  thresholdChallengeRate: number;
  challengeRateThresholdExceeded: boolean;
}

export const QualityRiskBadge: React.FC<QualityRiskBadgeProps> = ({ taskId, isQualityRisk }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<RiskBreakdown | null>(null);
  const timeoutRef = useRef<any>(null);

  const fetchBreakdown = async () => {
    if (breakdown || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crs/${taskId}/quality-risk`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data);
      }
    } catch (err) {
      console.error('Failed to fetch quality risk breakdown', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(true);
    fetchBreakdown();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  };

  if (!isQualityRisk) {
    return <span className="text-[9px] text-slate-500 font-medium">Low Risk</span>;
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="flex items-center gap-1.5 text-[9.5px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold cursor-pointer hover:bg-rose-500/20 transition-all select-none">
        <ShieldAlert className="h-3 w-3 text-rose-400" />
        Quality Risk
      </span>

      {showTooltip && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#0c1223]/95 backdrop-blur-md border border-white/[0.08] p-4 rounded-xl shadow-2xl z-50 text-[11px] text-slate-355 pointer-events-auto"
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="font-bold text-slate-100 mb-2 border-b border-white/[0.06] pb-1">
            Quality Risk Factors
          </div>

          {loading && !breakdown ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
            </div>
          ) : breakdown ? (
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between items-center">
                <span>Total Bugs:</span>
                <span className={`font-mono font-bold ${breakdown.bugThresholdExceeded ? 'text-rose-400' : 'text-slate-400'}`}>
                  {breakdown.bugCount} / {breakdown.thresholdBugs}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Retests:</span>
                <span className={`font-mono font-bold ${breakdown.retestThresholdExceeded ? 'text-rose-400' : 'text-slate-400'}`}>
                  {breakdown.retestCount} / {breakdown.thresholdRetests}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rejected Bugs:</span>
                <span className={`font-mono font-bold ${breakdown.rejectedBugsThresholdExceeded ? 'text-rose-400' : 'text-slate-400'}`}>
                  {breakdown.rejectedBugCount} / {breakdown.thresholdRejectedBugs}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Challenge Rate:</span>
                <span className={`font-mono font-bold ${breakdown.challengeRateThresholdExceeded ? 'text-rose-400' : 'text-slate-400'}`}>
                  {Math.round(breakdown.challengeRate * 100)}% / {Math.round(breakdown.thresholdChallengeRate * 100)}%
                </span>
              </div>
              <div className="text-[9px] text-slate-400 border-t border-white/[0.06] pt-1.5 mt-1 leading-normal italic">
                {breakdown.isQualityRisk 
                  ? "Tripped: " + [
                      breakdown.bugThresholdExceeded && "Bugs",
                      breakdown.retestThresholdExceeded && "Retests",
                      breakdown.rejectedBugsThresholdExceeded && "Rejections",
                      breakdown.challengeRateThresholdExceeded && "Challenges"
                    ].filter(Boolean).join(", ")
                  : "All metrics below critical levels."}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic py-2 text-center">Failed to load details</div>
          )}
        </div>
      )}
    </div>
  );
};
