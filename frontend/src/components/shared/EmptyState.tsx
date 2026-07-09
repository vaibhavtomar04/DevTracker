/**
 * EmptyState — premium empty state placeholder with visual illustration and action button
 */

import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '✨',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center justify-center text-center p-12 rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-sm ${className}`}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center text-3xl mb-4 shadow-inner" style={{ background: 'linear-gradient(135deg, rgba(var(--primary-rgb),0.12), rgba(var(--secondary-rgb),0.12))' }}
      >
        {icon}
      </motion.div>

      <h3 className="text-base font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl text-white font-medium text-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'var(--linearPrimarySecondary)', boxShadow: '0 4px 14px rgba(var(--primary-rgb),0.3)' }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
