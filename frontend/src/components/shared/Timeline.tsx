/**
 * Timeline — reusable vertical workflow timeline component
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface TimelineStep {
  id: string | number;
  title: string;
  subtitle?: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming';
  icon?: string;
  description?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ steps, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Vertical Connecting Line */}
      <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-white/10" />

      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              className="relative flex items-start gap-4 group"
            >
              {/* Status Circle / Node */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all border-2 ${
                  isCompleted
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : isCurrent
                    ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                    : 'bg-zinc-900 border-white/10 text-zinc-600'
                }`}
              >
                {step.icon ? step.icon : isCompleted ? '✓' : index + 1}
              </div>

              {/* Step Content Card */}
              <div
                className={`flex-1 p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-sky-500/30 bg-sky-500/5 shadow-md'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4
                    className={`text-sm font-semibold ${
                      isCompleted ? 'text-emerald-300' : isCurrent ? 'text-sky-300' : 'text-zinc-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {step.date && <span className="text-xs text-zinc-500 shrink-0 font-mono">{step.date}</span>}
                </div>

                {step.subtitle && <p className="text-xs text-zinc-400 font-medium mb-1">{step.subtitle}</p>}
                {step.description && <p className="text-xs text-zinc-500 leading-relaxed">{step.description}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
