import React, { useState } from "react";
import { X, ShieldCheck, ShieldAlert, Lock, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { useAuthStore } from "@/store/authStore";

interface MfaDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MfaDeactivateModal: React.FC<MfaDeactivateModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your current password to confirm deactivation.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await apiClient("/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ password })
      });

      // Update local auth store user state
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.setState({ user: { ...currentUser, mfaEnabled: false } });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate MFA. Verify your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fadeIn">
      <div className="bg-card border border-border rounded-3xl w-full max-w-md p-7 shadow-2xl text-card-foreground relative overflow-hidden">
        
        {/* Top Red Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-rose-500 to-amber-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">MFA Active on Account</h3>
              <p className="text-xs text-muted-foreground">Security Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-450 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDeactivate} className="py-5 space-y-5">
          <div className="p-4 rounded-2xl bg-muted border border-border space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> MFA Already Enabled for This Account
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              Two-factor protection is currently active using Microsoft Authenticator. To deactivate it, enter your account password below and click <strong>Deactivate</strong>.
            </p>
            <div className="pt-2 text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>After deactivating MFA, you will be able to log in using only your email/username and password.</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                placeholder="Enter current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 bg-background border border-border rounded-xl pl-10 pr-4 text-xs text-foreground placeholder:text-slate-500 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 h-11 rounded-2xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Keep MFA
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 h-11 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <>Deactivate MFA <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
