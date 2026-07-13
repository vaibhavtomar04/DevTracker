import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Copy, Check, Download, ArrowRight, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiClient } from "@/utils/apiClient";
import { useTaskStore } from "@/store/taskStore";

interface MfaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MfaWizard: React.FC<MfaWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<"intro" | "qr" | "verify" | "backup">("intro");
  const [secretKey, setSecretKey] = useState("");
  const [otpAuthUri, setOtpAuthUri] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const { addToast } = useTaskStore();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("intro");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/mfa/enable", { method: "POST" });
      if (res && res.secretKey) {
        setSecretKey(res.secretKey);
        setOtpAuthUri(res.otpAuthUri);
        setStep("qr");
      }
    } catch (err: any) {
      addToast(err.message || "Failed to initialize MFA setup.", "error");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      addToast("Enter 6-digit code.", "error");
      return;
    }
    setLoading(true);

    try {
      await apiClient("/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: otpCode })
      });

      const bcRes = await apiClient("/mfa/backup-codes", { method: "POST" });
      if (bcRes && bcRes.backupCodes) {
        setBackupCodes(bcRes.backupCodes);
      }
      setStep("backup");
    } catch (err: any) {
      addToast(err.message || "Verification code incorrect. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const text = `DevTrack 2.0 Single-Use Backup Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nNote: Each code can be used exactly once if you lose access to your authenticator app. Keep them secure.`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devtrack-backup-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fadeIn">
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-7 shadow-2xl text-card-foreground relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Secure Your Account (MFA)</h3>
              <p className="text-xs text-muted-foreground">Microsoft Authenticator Setup Wizard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>



        {/* Step 1: Intro */}
        {step === "intro" && (
          <div className="py-6 space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20 max-w-sm mx-auto">
              <p className="text-xs text-foreground leading-relaxed">
                Protect your DevTrack engineering tasks and deployments with Two-Factor Authentication using <strong>Microsoft Authenticator</strong> or any RFC 6238 app.
              </p>
            </div>
            <button
              onClick={startEnrollment}
              disabled={loading}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <>Enable MFA <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}

        {/* Step 2: QR Scan & Setup */}
        {step === "qr" && (
          <div className="py-5 space-y-5">
            <div className="space-y-2 text-xs text-foreground">
              <p className="font-semibold text-violet-600 dark:text-violet-300">1. Install Microsoft Authenticator on your phone.</p>
              <p className="font-semibold text-violet-600 dark:text-violet-300">2. Tap &quot;Add Account&quot; → Work or School / Other.</p>
              <p className="font-semibold text-violet-600 dark:text-violet-300">3. Scan QR Code or manually enter secret key below:</p>
            </div>

            {/* QR payload display */}
            <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center max-w-[200px] mx-auto shadow-xl">
              {otpAuthUri ? (
                <QRCodeSVG
                  value={otpAuthUri}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs font-medium">Generating QR...</div>
              )}
            </div>

            {/* Manual Secret Box */}
            <div className="p-3 rounded-xl bg-muted border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">Manual Entry Secret</span>
                <span className="font-mono text-xs text-violet-600 dark:text-violet-300 tracking-wider font-bold">{secretKey}</span>
              </div>
              <button
                type="button"
                onClick={copySecret}
                className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1 text-xs font-medium cursor-pointer"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              Next: Verify Code <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 3: Verify Test Code */}
        {step === "verify" && (
          <form onSubmit={verifySetup} className="py-5 space-y-5">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-foreground">Enter Generated 6-Digit Code</h4>
              <p className="text-xs text-muted-foreground">Enter the current code from Microsoft Authenticator to complete setup.</p>
            </div>

            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              className="w-full h-12 bg-background border border-border rounded-2xl text-center font-mono text-2xl font-bold text-violet-600 dark:text-violet-300 tracking-widest outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
              required
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("qr")}
                className="w-1/3 h-11 rounded-2xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify & Enable MFA"}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Download Backup Codes */}
        {step === "backup" && (
          <div className="py-5 space-y-5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>MFA Successfully Enabled! Save your 10 recovery codes below.</span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 rounded-2xl bg-muted border border-border font-mono text-xs text-foreground">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-card rounded-xl text-center border border-border font-bold tracking-wider">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={downloadBackupCodes}
                className="w-1/2 h-11 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="h-4 w-4" /> Download Codes (.txt)
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-1/2 h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                Finish Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
