import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Award, Star, Sparkles, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AchievementNotification } from "@/services/recognition.service";

interface AchievementUnlockModalProps {
  notification: AchievementNotification | null;
  onClose: () => void;
}

export function AchievementUnlockModal({ notification, onClose }: AchievementUnlockModalProps) {
  const navigate = useNavigate();

  if (!notification) return null;

  const isLevelUp = notification.notificationType === "LEVEL_UP";

  const handleViewBadges = () => {
    onClose();
    navigate("/dashboard/recognition");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop blur with radial dark overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Ambient background glow */}
        <div className="absolute w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/30 bg-card/95 p-6 md:p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(245,158,11,0.25)] text-foreground text-center z-10 space-y-5"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Celebratory Badge Icon Container with Pulsing Rings */}
          <div className="relative mx-auto h-24 w-24 flex items-center justify-center">
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className="absolute rounded-full border border-amber-500/30"
                style={{
                  width: 80 + ring * 24,
                  height: 80 + ring * 24,
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.8, 1.15, 1], opacity: [0, 0.5, 0] }}
                transition={{ duration: 2.4, delay: ring * 0.2, repeat: Infinity, ease: "easeOut" }}
              />
            ))}

            <motion.div
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
              className="relative h-20 w-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.6)]"
            >
              {isLevelUp ? (
                <Trophy className="h-10 w-10 text-white drop-shadow-md" />
              ) : (
                <Award className="h-10 w-10 text-white drop-shadow-md" />
              )}
            </motion.div>
          </div>

          {/* Headline Banner */}
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-black tracking-widest uppercase shadow-sm">
              <Sparkles className="h-3 w-3" />
              <span>{isLevelUp ? "TIER LEVEL UP!" : "ACHIEVEMENT UNLOCKED!"}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight pt-1">
              {notification.title}
            </h2>
          </div>

          {/* Description Message */}
          <p className="text-xs text-muted-foreground leading-relaxed font-medium px-2">
            {notification.message}
          </p>

          {/* Points Delta Reward */}
          {notification.pointsDelta > 0 && (
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-sm shadow-sm">
              <Star className="h-4 w-4 fill-current" />
              <span>+{notification.pointsDelta} Recognition Points</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-bold transition-all cursor-pointer"
            >
              Awesome!
            </button>
            <button
              onClick={handleViewBadges}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-extrabold shadow-md hover:opacity-95 transition-all cursor-pointer"
            >
              <span>View Badges</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
